"use client";

import { httpsCallable } from "firebase/functions";
import { getClientFunctions, CLIENT_WL_APP_ID } from "@/config/firebase-client";
import {
  MARKETING_SCHEMA_VERSION,
  type MarketingAttribution,
  type MarketingConsent,
  type MarketingEvent,
  type MarketingEventType,
  type MarketingOrderContext,
} from "@/marketing/types";

const CONSENT_KEY = "delizza_marketing_consent_v1";
const SESSION_KEY = "delizza_marketing_session_v1";
const VISITOR_KEY = "delizza_marketing_visitor_v1";
const QUEUE_KEY = "delizza_marketing_queue_v1";
const ATTRIBUTION_KEY = "delizza_marketing_attribution_v1";
const ATTRIBUTION_TOKEN_KEY = "delizza_marketing_attribution_token_v1";
const ERASURE_KEY = "delizza_marketing_erasure_v1";
const ORDER_LINK_QUEUE_KEY = "delizza_marketing_order_links_v1";
const PUBLIC_CONFIG_KEY = "delizza_marketing_public_config_v1";
const COLLECTION_PAUSE_KEY = "delizza_marketing_collection_pause_v1";
const PENDING_REVOCATION_KEY = "delizza_marketing_pending_revocation_v1";
const CONSENT_MAX_AGE_MS = 183 * 24 * 60 * 60 * 1000;
const CONSENT_NOTICE_REVISION = process.env.NEXT_PUBLIC_MARKETING_CONSENT_REVISION?.trim() || "2026-10-12";
const SESSION_MAX_AGE_MS = 30 * 60 * 1000;
const MAX_QUEUE_EVENTS = 100;
const MAX_BATCH_EVENTS = 20;
const MAX_RETRIES = 3;
let publicConfigVerifiedThisPage = false;
let consentGeneration = 0;

type StoredSession = { id: string; startedAt: string; lastSeenAt: string; startedEventQueued?: boolean };
type StoredVisitor = { id: string; createdAt: string };
type StoredAttribution = { value: MarketingAttribution; capturedAt: string };
type QueuedEvent = MarketingEvent & { attempts: number };
type QueuedOrderLink = { orderId: string; context: MarketingOrderContext; attempts: number };
type MarketingPublicConfig = { enabled: boolean; windowDays: number; retentionDays: number; revision: string; fetchedAt: string };
type MarketingCallableName = "marketingCollect" | "marketingPublicConfig" | "marketingLinkOrder";
type MarketingTestTransport = { invoke: (name: MarketingCallableName, payload: unknown) => Promise<{ data: unknown }> };
type PendingRevocation = { sessionId: string; erasureToken: string; createdAt: string; expiresAt: string };

export interface MarketingState {
  enabled: boolean;
  sourceId: string | null;
  consent: MarketingConsent | null;
}

function getItem<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function setItem(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage is optional */ }
}

function removeItem(key: string): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(key); } catch { /* storage is optional */ }
}

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function isoNow(): string { return new Date().toISOString(); }

function cleanPath(path: string): string {
  const value = path.split("?")[0]?.split("#")[0] ?? "/";
  return value.startsWith("/") ? value.slice(0, 256) : "/";
}

function cleanText(value: string | null, max = 120): string | undefined {
  if (!value) return undefined;
  const cleaned = value.trim().slice(0, max);
  return cleaned || undefined;
}

function hasMarketingBuildConfiguration(): boolean {
  const sourceId = process.env.NEXT_PUBLIC_MARKETING_SOURCE_ID?.trim();
  if (!sourceId) return false;
  if (process.env.NODE_ENV === "production") return process.env.NEXT_PUBLIC_MARKETING_ENABLED === "true";
  return process.env.NEXT_PUBLIC_MARKETING_TEST_MODE === "true";
}

function sourceId(): string | null {
  return hasMarketingBuildConfiguration() ? (process.env.NEXT_PUBLIC_MARKETING_SOURCE_ID?.trim() || null) : null;
}

function publicConfig(): MarketingPublicConfig | null {
  const config = getItem<MarketingPublicConfig>(PUBLIC_CONFIG_KEY);
  if (!config || !config.enabled || !Number.isInteger(config.windowDays) || config.windowDays < 1 || config.windowDays > 90 || !Number.isInteger(config.retentionDays) || config.retentionDays < 1 || typeof config.revision !== "string") return null;
  return config;
}

function isCollectionPaused(): boolean {
  const until = getItem<number>(COLLECTION_PAUSE_KEY);
  return typeof until === "number" && Number.isFinite(until) && until > Date.now();
}

function isCollectionEnabled(): boolean { return hasMarketingBuildConfiguration() && publicConfigVerifiedThisPage && !isCollectionPaused() && Boolean(publicConfig()); }

function validConsent(value: MarketingConsent | null): value is MarketingConsent {
  if (!value || typeof value.updatedAt !== "string" || typeof value.revision !== "string") return false;
  if (value.revision !== CONSENT_NOTICE_REVISION) return false;
  const age = Date.now() - Date.parse(value.updatedAt);
  return Number.isFinite(age) && age >= 0 && age <= CONSENT_MAX_AGE_MS;
}

export function getMarketingState(): MarketingState {
  const consent = getItem<MarketingConsent>(CONSENT_KEY);
  return { enabled: isCollectionEnabled(), sourceId: sourceId(), consent: validConsent(consent) ? consent : null };
}

function getOrCreateSession(): StoredSession | null {
  const stored = getItem<StoredSession>(SESSION_KEY);
  const now = Date.now();
  if (stored && stored.id && Date.parse(stored.lastSeenAt) + SESSION_MAX_AGE_MS > now) {
    const next = { ...stored, lastSeenAt: isoNow() };
    setItem(SESSION_KEY, next);
    return next;
  }
  const created = { id: uuid(), startedAt: isoNow(), lastSeenAt: isoNow() };
  setItem(SESSION_KEY, created);
  return created;
}

function ensureSessionStartQueued(): void {
  const session = getOrCreateSession();
  if (!session || session.startedEventQueued) return;
  setItem(SESSION_KEY, { ...session, startedEventQueued: true });
  const events = queue();
  events.push({ id: uuid(), type: "session_start", occurredAt: isoNow(), attempts: 0 });
  saveQueue(events);
}

function getOrCreateVisitor(): StoredVisitor {
  const stored = getItem<StoredVisitor>(VISITOR_KEY);
  const ttlMs = (publicConfig()?.windowDays ?? 0) * 24 * 60 * 60 * 1000;
  if (stored?.id && ttlMs > 0 && Date.parse(stored.createdAt) + ttlMs > Date.now()) return stored;
  const created = { id: uuid(), createdAt: isoNow() };
  setItem(VISITOR_KEY, created);
  return created;
}

function captureAttribution(): MarketingAttribution | undefined {
  if (typeof window === "undefined") return undefined;
  const previousAttribution = currentAttribution();
  const params = new URLSearchParams(window.location.search);
  const value: MarketingAttribution = {
    utm_source: cleanText(params.get("utm_source")),
    utm_medium: cleanText(params.get("utm_medium")),
    utm_campaign: cleanText(params.get("utm_campaign")),
    utm_content: cleanText(params.get("utm_content")),
    utm_term: cleanText(params.get("utm_term")),
    campaignLinkId: cleanText(params.get("mk_link")),
    landingPath: cleanPath(window.location.pathname),
  };
  try {
    // document.referrer does not change on client-side navigation. It is only
    // a useful acquisition signal before a prior touchpoint exists.
    const referrer = !previousAttribution && document.referrer ? new URL(document.referrer).hostname.toLowerCase() : undefined;
    if (referrer && referrer !== window.location.hostname.toLowerCase()) value.referrerDomain = cleanText(referrer);
  } catch { /* malformed or unavailable referrer is intentionally ignored */ }
  // A direct internal navigation must not replace the previous non-direct
  // campaign touchpoint merely because it has a new landing path.
  const hasAcquisitionSignal = Boolean(
    value.utm_source || value.utm_medium || value.utm_campaign || value.utm_content ||
    value.utm_term || value.campaignLinkId || value.referrerDomain,
  );
  if (!hasAcquisitionSignal) return undefined;
  setItem(ATTRIBUTION_KEY, { value, capturedAt: isoNow() } satisfies StoredAttribution);
  return value;
}

function currentAttribution(): MarketingAttribution | undefined {
  const stored = getItem<StoredAttribution>(ATTRIBUTION_KEY);
  const ttlMs = (publicConfig()?.windowDays ?? 0) * 24 * 60 * 60 * 1000;
  if (!stored || ttlMs <= 0 || Date.parse(stored.capturedAt) + ttlMs <= Date.now()) return undefined;
  return stored.value;
}

function queue(): QueuedEvent[] {
  const stored = getItem<QueuedEvent[]>(QUEUE_KEY);
  return Array.isArray(stored) ? stored.slice(-MAX_QUEUE_EVENTS) : [];
}

function saveQueue(events: QueuedEvent[]): void { setItem(QUEUE_KEY, events.slice(-MAX_QUEUE_EVENTS)); }

function callable() {
  return httpsCallable(getClientFunctions(), "marketingCollect");
}

function testTransport(): MarketingTestTransport | undefined {
  return (globalThis as typeof globalThis & { __DELIZZA_MARKETING_TEST_TRANSPORT__?: MarketingTestTransport }).__DELIZZA_MARKETING_TEST_TRANSPORT__;
}

function invokeMarketingCallable(name: MarketingCallableName, payload: unknown): Promise<{ data: unknown }> {
  const transport = testTransport();
  if (transport) return transport.invoke(name, payload);
  if (name === "marketingCollect") return callable()(payload) as Promise<{ data: unknown }>;
  return httpsCallable(getClientFunctions(), name)(payload) as Promise<{ data: unknown }>;
}

function orderLinks(): QueuedOrderLink[] {
  const stored = getItem<QueuedOrderLink[]>(ORDER_LINK_QUEUE_KEY);
  return Array.isArray(stored) ? stored.slice(-20) : [];
}

function saveOrderLinks(links: QueuedOrderLink[]): void { setItem(ORDER_LINK_QUEUE_KEY, links.slice(-20)); }

async function flush(): Promise<{ attributionToken?: string; erasureToken?: string } | undefined> {
  const state = getMarketingState();
  if (!state.enabled || !state.sourceId || !state.consent?.analytics) return undefined;
  const session = getOrCreateSession();
  if (!session) return undefined;
  const all = queue();
  if (all.length === 0) return undefined;
  const batch = all.slice(0, MAX_BATCH_EVENTS);
  const attribution = state.consent.marketing ? currentAttribution() : undefined;
  const operationGeneration = consentGeneration;
  try {
    const result = await invokeMarketingCallable("marketingCollect", {
      schemaVersion: MARKETING_SCHEMA_VERSION,
      appId: CLIENT_WL_APP_ID,
      sourceId: state.sourceId,
      session: { id: session.id, visitorId: getOrCreateVisitor().id, startedAt: session.startedAt },
      consent: state.consent,
      events: batch.map((queuedEvent) => {
        const event = { ...queuedEvent } as MarketingEvent & { attempts?: number };
        delete event.attempts;
        return event;
      }),
      ...(attribution ? { attribution } : {}),
    });
    const data = result.data as {
      attributionToken?: unknown; erasureToken?: unknown; acceptedEventIds?: unknown;
      duplicateEventIds?: unknown; droppedEventIds?: unknown; collectionState?: unknown;
    };
    // A withdrawal/change may happen while the callable is in flight. Never
    // restore its old queue or opaque tokens after that local decision.
    if (operationGeneration !== consentGeneration) return undefined;
    const collectionState = typeof data.collectionState === "string" ? data.collectionState : "accepted";
    const terminalStates = new Set(["limited", "consent_denied", "revoked", "disabled"]);
    const terminalIds = [data.acceptedEventIds, data.duplicateEventIds, data.droppedEventIds]
      .flatMap((value) => Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : []);
    const terminalIdSet = new Set(terminalIds);
    if (terminalStates.has(collectionState)) {
      saveQueue(all.slice(batch.length));
      if (collectionState === "limited") setItem(COLLECTION_PAUSE_KEY, Date.now() + 15 * 60 * 1000);
      if (collectionState === "disabled" || collectionState === "revoked" || collectionState === "consent_denied") {
        removeItem(PUBLIC_CONFIG_KEY); removeItem(COLLECTION_PAUSE_KEY);
        publicConfigVerifiedThisPage = false;
      }
    } else if (terminalIdSet.size > 0) {
      saveQueue(all.filter((event) => !terminalIdSet.has(event.id)));
    } else {
      // Backward-compatible successful responses are terminal for their batch.
      saveQueue(all.slice(batch.length));
    }
    if (typeof data.attributionToken === "string") setItem(ATTRIBUTION_TOKEN_KEY, data.attributionToken);
    if (typeof data.erasureToken === "string") setItem(ERASURE_KEY, data.erasureToken);
    return {
      attributionToken: typeof data.attributionToken === "string" ? data.attributionToken : undefined,
      erasureToken: typeof data.erasureToken === "string" ? data.erasureToken : undefined,
    };
  } catch (error) {
    if (operationGeneration !== consentGeneration) return undefined;
    const code = typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "") : "";
    if (["functions/invalid-argument", "functions/failed-precondition", "functions/permission-denied", "invalid-argument", "failed-precondition", "permission-denied"].includes(code)) {
      saveQueue(all.slice(batch.length));
      if (code.endsWith("permission-denied")) {
        removeItem(PUBLIC_CONFIG_KEY); removeItem(COLLECTION_PAUSE_KEY);
        publicConfigVerifiedThisPage = false;
      }
      return undefined;
    }
    const failedIds = new Set(batch.map((event) => event.id));
    saveQueue(all.map((event) => failedIds.has(event.id) ? { ...event, attempts: event.attempts + 1 } : event)
      .filter((event) => event.attempts <= MAX_RETRIES));
    return undefined;
  }
}

export function setMarketingConsent(next: Pick<MarketingConsent, "analytics" | "marketing">): MarketingConsent {
  const previous = getMarketingState().consent;
  const normalized = { analytics: Boolean(next.analytics), marketing: Boolean(next.analytics && next.marketing) };
  consentGeneration += 1;
  const consent: MarketingConsent = { ...normalized, revision: CONSENT_NOTICE_REVISION, updatedAt: isoNow() };
  const purposeChanged = Boolean(previous && (previous.analytics !== consent.analytics || previous.marketing !== consent.marketing));
  if (purposeChanged) {
    // Do not let a later order inherit a session or attribution created under
    // a broader purpose. The new choice starts with a fresh anonymous scope.
    removeItem(QUEUE_KEY); removeItem(ORDER_LINK_QUEUE_KEY); removeItem(SESSION_KEY); removeItem(VISITOR_KEY);
    removeItem(ATTRIBUTION_KEY); removeItem(ATTRIBUTION_TOKEN_KEY); removeItem(ERASURE_KEY); removeItem(COLLECTION_PAUSE_KEY);
  }
  setItem(CONSENT_KEY, consent);
  window.dispatchEvent(new CustomEvent("delizza-marketing-consent", { detail: consent }));
  if (consent.analytics && hasMarketingBuildConfiguration()) {
    void loadMarketingPublicConfigAfterConsent();
  } else {
    removeItem(QUEUE_KEY);
    removeItem(SESSION_KEY);
    removeItem(VISITOR_KEY);
    removeItem(ATTRIBUTION_KEY); removeItem(ATTRIBUTION_TOKEN_KEY); removeItem(ORDER_LINK_QUEUE_KEY); removeItem(PUBLIC_CONFIG_KEY); removeItem(COLLECTION_PAUSE_KEY);
    publicConfigVerifiedThisPage = false;
  }
  return consent;
}

/** Fetches the server-authoritative source configuration only after opt-in. */
export async function loadMarketingPublicConfigAfterConsent(): Promise<void> {
  const storedConsent = getMarketingState().consent;
  const configuredSource = sourceId();
  if (!storedConsent?.analytics || !configuredSource || !hasMarketingBuildConfiguration()) return;
  const operationGeneration = consentGeneration;
  try {
    const result = await invokeMarketingCallable("marketingPublicConfig", { appId: CLIENT_WL_APP_ID, sourceId: configuredSource });
    if (operationGeneration !== consentGeneration || !getMarketingState().consent?.analytics) return;
    const data = result.data as { enabled?: unknown; sourceId?: unknown; attributionWindowDays?: unknown; sessionRetentionDays?: unknown; consentRevision?: unknown };
    if (data.enabled !== true || data.sourceId !== configuredSource || !Number.isInteger(data.attributionWindowDays) || !Number.isInteger(data.sessionRetentionDays) || data.consentRevision !== CONSENT_NOTICE_REVISION || data.consentRevision !== storedConsent.revision) throw new Error("invalid public marketing config");
    setItem(PUBLIC_CONFIG_KEY, { enabled: true, windowDays: data.attributionWindowDays as number, retentionDays: data.sessionRetentionDays as number, revision: data.consentRevision, fetchedAt: isoNow() } satisfies MarketingPublicConfig);
    publicConfigVerifiedThisPage = true;
    ensureSessionStartQueued();
    void flush();
    window.dispatchEvent(new CustomEvent("delizza-marketing-config"));
  } catch {
    // The backend is authoritative: an unavailable or rejected configuration disables collection.
    removeItem(PUBLIC_CONFIG_KEY); removeItem(COLLECTION_PAUSE_KEY);
    removeItem(QUEUE_KEY);
    publicConfigVerifiedThisPage = false;
  }
}

export function recordMarketingEvent(
  type: MarketingEventType,
  detail: Omit<MarketingEvent, "id" | "type" | "occurredAt"> = {},
): void {
  const state = getMarketingState();
  if (!state.enabled || !state.consent?.analytics) return;
  if (type !== "session_start") ensureSessionStartQueued();
  const event: QueuedEvent = {
    id: uuid(),
    type,
    occurredAt: isoNow(),
    attempts: 0,
    ...(detail.path ? { path: cleanPath(detail.path) } : {}),
    ...(detail.productId ? { productId: cleanText(detail.productId, 120) } : {}),
    ...(typeof detail.quantity === "number" && Number.isInteger(detail.quantity) && detail.quantity > 0 && detail.quantity <= 100 ? { quantity: detail.quantity } : {}),
    ...(detail.errorCode && /^[a-z0-9_]{1,64}$/i.test(detail.errorCode) ? { errorCode: detail.errorCode } : {}),
  };
  const events = queue();
  events.push(event);
  saveQueue(events);
  if (state.consent.marketing && type === "page_view") {
    const attribution = captureAttribution();
    if (attribution) {
      events.push({ id: uuid(), type: "campaign_visit", occurredAt: isoNow(), path: detail.path ? cleanPath(detail.path) : undefined, attempts: 0 });
      saveQueue(events);
    }
  }
  void flush();
}

export async function getOrderMarketingContext(timeoutMs = 650): Promise<MarketingOrderContext | undefined> {
  const state = getMarketingState();
  if (!state.enabled || !state.sourceId || !state.consent?.analytics) return undefined;
  const session = getOrCreateSession();
  if (!session) return undefined;
  const result = await Promise.race([
    flush(),
    new Promise<undefined>((resolve) => window.setTimeout(() => resolve(undefined), timeoutMs)),
  ]);
  const token = result?.attributionToken ?? getItem<string>(ATTRIBUTION_TOKEN_KEY) ?? undefined;
  return { sessionId: session.id, sourceId: state.sourceId, ...(token ? { attributionToken: token } : {}) };
}

/** Links an already-created order to a consented marketing session. Never delays order creation or payment. */
export function linkOrderMarketing(orderId: string): void {
  void (async () => {
    // The bounded wait happens after createOrder and is intentionally detached
    // from both order creation and payment.
    const context = await getOrderMarketingContext(750);
    if (!context || !orderId) return;
    const pending = orderLinks().filter((entry) => entry.orderId !== orderId);
    pending.push({ orderId, context, attempts: 0 });
    saveOrderLinks(pending);
    const first = pending[0];
    if (!first) return;
    try {
      await invokeMarketingCallable("marketingLinkOrder", { appId: CLIENT_WL_APP_ID, orderId: first.orderId, context: first.context });
      saveOrderLinks(orderLinks().filter((entry) => entry.orderId !== first.orderId));
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code ?? "") : "";
      if (["functions/invalid-argument", "functions/failed-precondition", "functions/permission-denied", "invalid-argument", "failed-precondition", "permission-denied"].includes(code)) {
        saveOrderLinks(orderLinks().filter((entry) => entry.orderId !== first.orderId));
        return;
      }
      saveOrderLinks(orderLinks().map((entry) => entry.orderId === first.orderId ? { ...entry, attempts: entry.attempts + 1 } : entry)
        .filter((entry) => entry.attempts <= MAX_RETRIES));
    }
  })();
}

export async function revokeMarketingConsent(): Promise<void> {
  const state = getMarketingState();
  const session = getItem<StoredSession>(SESSION_KEY);
  const erasureToken = getItem<string>(ERASURE_KEY);
  // Apply the browser-side withdrawal before awaiting the network. It prevents
  // an in-flight collector response from resurrecting data locally.
  if (state.sourceId && session?.id && erasureToken) {
    setItem(PENDING_REVOCATION_KEY, { sessionId: session.id, erasureToken, createdAt: isoNow(), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() } satisfies PendingRevocation);
  }
  setMarketingConsent({ analytics: false, marketing: false });
  await retryPendingMarketingRevocation();
}

/** Retries only the minimal server-erasure capability; it never resumes collection. */
export async function retryPendingMarketingRevocation(): Promise<void> {
  const pending = getItem<PendingRevocation>(PENDING_REVOCATION_KEY);
  const configuredSource = sourceId();
  if (!pending || !configuredSource) return;
  if (!pending.sessionId || !pending.erasureToken || Date.parse(pending.expiresAt) <= Date.now()) {
    removeItem(PENDING_REVOCATION_KEY);
    return;
  }
  try {
    await invokeMarketingCallable("marketingCollect", { schemaVersion: MARKETING_SCHEMA_VERSION, appId: CLIENT_WL_APP_ID, sourceId: configuredSource, action: "revoke", session: { id: pending.sessionId }, erasureToken: pending.erasureToken });
    removeItem(PENDING_REVOCATION_KEY);
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
    if (["functions/invalid-argument", "functions/failed-precondition", "functions/permission-denied", "invalid-argument", "failed-precondition", "permission-denied"].includes(code)) removeItem(PENDING_REVOCATION_KEY);
  }
}

export function captureInitialAttributionIfAllowed(): void {
  const state = getMarketingState();
  if (state.enabled && state.consent?.analytics && state.consent.marketing) captureAttribution();
}
