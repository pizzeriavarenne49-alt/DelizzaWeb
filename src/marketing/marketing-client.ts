"use client";

import { httpsCallable } from "firebase/functions";
import { getClientFunctions, CLIENT_WL_APP_ID } from "@/config/firebase-client";
import {
  META_PURCHASE_ARMED_EVENT,
  configureMetaPixel,
  createMetaPurchaseEventId,
  metaAdvertisingAvailable,
  readMetaLandingClick,
  readMetaMatchContext,
  rememberMetaCheckout,
  trackMetaPixel,
  type MetaEventName,
} from "@/marketing/meta-pixel";
import {
  MARKETING_SCHEMA_VERSION,
  META_CONSENT_REVISION,
  type MarketingAttribution,
  type MarketingConsent,
  type MarketingEvent,
  type MarketingEventType,
  type MarketingOrderContext,
} from "@/marketing/types";

export const MARKETING_CONSENT_KEY = "delizza_marketing_consent_v1";
const SESSION_KEY = "delizza_marketing_session_v1";
const VISITOR_KEY = "delizza_marketing_visitor_v1";
const QUEUE_KEY = "delizza_marketing_queue_v1";
const ATTRIBUTION_KEY = "delizza_marketing_attribution_v1";
const ATTRIBUTION_TOKEN_KEY = "delizza_marketing_attribution_token_v1";
const ERASURE_KEY = "delizza_marketing_erasure_v1";
const ERASURE_CAPABILITIES_KEY = "delizza_marketing_erasure_capabilities_v1";
const ORDER_LINK_QUEUE_KEY = "delizza_marketing_order_links_v1";
const PUBLIC_CONFIG_KEY = "delizza_marketing_public_config_v1";
const COLLECTION_PAUSE_KEY = "delizza_marketing_collection_pause_v1";
const PENDING_REVOCATION_KEY = "delizza_marketing_pending_revocation_v1";
const CONSENT_MAX_AGE_MS = 183 * 24 * 60 * 60 * 1000;
const CONSENT_NOTICE_REVISION = process.env.NEXT_PUBLIC_MARKETING_CONSENT_REVISION?.trim() ||
  (metaAdvertisingAvailable() ? META_CONSENT_REVISION : "2026-10-12");
const SESSION_MAX_AGE_MS = 30 * 60 * 1000;
const MAX_QUEUE_EVENTS = 100;
const MAX_BATCH_EVENTS = 20;
const MAX_RETRIES = 3;
const META_FUNNEL_EVENTS: Partial<Record<MarketingEventType, MetaEventName>> = {
  page_view: "PageView", product_view: "ViewContent", add_to_cart: "AddToCart", checkout_start: "InitiateCheckout",
};
let publicConfigVerifiedThisPage = false;
let consentGeneration = 0;
let lastWithdrawalGeneration = 0;
let pendingLanding: MarketingAttribution | undefined;
let pendingMetaClick: string | undefined;
let collectionRequest: Promise<void> | null = null;
let contextDirty = false;
let linkRequest: Promise<void> | null = null;
let revocationRequest: Promise<void> | null = null;

type StoredSession = { id: string; startedAt: string; lastSeenAt: string; startedEventQueued?: boolean };
type StoredVisitor = { id: string; createdAt: string };
type StoredAttribution = { value: MarketingAttribution; capturedAt: string };
type QueuedEvent = MarketingEvent & { attempts: number };
type QueuedOrderLink = { orderId: string; context: MarketingOrderContext; attempts: number; expiresAt?: number };
type MarketingPublicConfig = { enabled: boolean; windowDays: number; retentionDays: number; revision: string; fetchedAt: string; metaPixelId?: string };
type MarketingCallableName = "marketingCollect" | "marketingPublicConfig" | "marketingLinkOrder";
type MarketingTestTransport = { invoke: (name: MarketingCallableName, payload: unknown) => Promise<{ data: unknown }> };
type RevocationCapability = { sessionId: string; erasureToken: string; expiresAt: string };

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
  const consent = getItem<MarketingConsent>(MARKETING_CONSENT_KEY);
  return { enabled: isCollectionEnabled(), sourceId: sourceId(), consent: validConsent(consent) ? consent : null };
}

export function canOfferMetaConsent(): boolean {
  return hasMarketingBuildConfiguration() && metaAdvertisingAvailable() && CONSENT_NOTICE_REVISION === META_CONSENT_REVISION;
}

function hasAnyMarketingPurpose(consent: MarketingConsent | null | undefined): consent is MarketingConsent {
  return Boolean(consent?.analytics || consent?.marketing || consent?.metaAdvertising);
}

function scopeReduced(previous: MarketingConsent | null, next: MarketingConsent | null): boolean {
  return Boolean((previous?.analytics && !next?.analytics) || (previous?.marketing && !next?.marketing) ||
    (previous?.metaAdvertising && !next?.metaAdvertising));
}

function terminalFailure(error: unknown): string | undefined {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code).split("/").pop() : undefined;
  return code && ["invalid-argument", "failed-precondition", "permission-denied"].includes(code) ? code : undefined;
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

function readLandingAttribution(): MarketingAttribution | undefined {
  if (typeof window === "undefined") return undefined;
  const previousAttribution = currentAttribution();
  const params = new URLSearchParams(window.location.search);
  const campaignId = params.get("utm_id");
  const value: MarketingAttribution = {
    ...(campaignId && /^\d{1,30}$/.test(campaignId) ? { utm_id: campaignId } : {}),
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
    value.utm_id || value.utm_source || value.utm_medium || value.utm_campaign || value.utm_content ||
    value.utm_term || value.campaignLinkId || value.referrerDomain,
  );
  return hasAcquisitionSignal ? value : undefined;
}

function captureAttribution(): MarketingAttribution | undefined {
  const value = pendingLanding ?? readLandingAttribution();
  pendingLanding = undefined;
  if (!value) return undefined;
  if (JSON.stringify(value) === JSON.stringify(currentAttribution())) return undefined;
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

function storedAttributionToken(sessionId: string): string | undefined {
  const stored = getItem<{ sessionId: string; token: string }>(ATTRIBUTION_TOKEN_KEY);
  return stored?.sessionId === sessionId && typeof stored.token === "string" ? stored.token : undefined;
}

function flush(): Promise<void> {
  if (collectionRequest) return collectionRequest;
  const generation = consentGeneration;
  collectionRequest = flushBatch().finally(() => {
    collectionRequest = null;
    const state = getMarketingState();
    const needsContextRefresh = contextDirty;
    contextDirty = false;
    if (state.enabled && (needsContextRefresh || (generation !== consentGeneration && (queue().length || state.consent?.marketing || state.consent?.metaAdvertising)))) void flush();
  });
  return collectionRequest;
}

async function flushBatch(): Promise<void> {
  const state = getMarketingState();
  if (!state.enabled || !state.sourceId || !hasAnyMarketingPurpose(state.consent)) return undefined;
  const session = getOrCreateSession();
  if (!session) return undefined;
  const all = queue();
  if (all.length === 0 && state.consent.analytics) return undefined;
  if (all.length === 0 && !state.consent.marketing && !state.consent.metaAdvertising) return undefined;
  const batch = all.slice(0, MAX_BATCH_EVENTS);
  const batchIds = new Set(batch.map((event) => event.id));
  const attribution = state.consent.marketing ? currentAttribution() : undefined;
  const operationGeneration = consentGeneration;
  const consent = { ...state.consent };
  if (!publicConfig()?.metaPixelId || !canOfferMetaConsent()) delete consent.metaAdvertising;
  const meta = consent.metaAdvertising ? readMetaMatchContext(pendingMetaClick) : undefined;
  if (meta?.fbc) pendingMetaClick = undefined;
  try {
    const result = await invokeMarketingCallable("marketingCollect", {
      schemaVersion: MARKETING_SCHEMA_VERSION,
      appId: CLIENT_WL_APP_ID,
      sourceId: state.sourceId,
      session: {
        id: session.id,
        ...(state.consent.analytics ? { visitorId: getOrCreateVisitor().id } : {}),
        startedAt: session.startedAt,
      },
      consent,
      events: batch.map((queuedEvent) => {
        const event = { ...queuedEvent } as MarketingEvent & { attempts?: number };
        delete event.attempts;
        return event;
      }),
      ...(attribution ? { attribution } : {}),
      ...(meta ? { meta } : {}),
    });
    const data = result.data as {
      attributionToken?: unknown; erasureToken?: unknown; acceptedEventIds?: unknown;
      duplicateEventIds?: unknown; droppedEventIds?: unknown; collectionState?: unknown;
    };
    // A withdrawal/change may happen while the callable is in flight. Never
    // restore its old queue or opaque tokens after that local decision.
    if (operationGeneration !== consentGeneration) {
      if (typeof data.erasureToken === "string" && (operationGeneration < lastWithdrawalGeneration || scopeReduced(state.consent, getMarketingState().consent))) {
        queueRevocation(session.id, data.erasureToken);
        void retryPendingMarketingRevocation();
      }
      return;
    }
    const collectionState = typeof data.collectionState === "string" ? data.collectionState : "accepted";
    const terminalStates = new Set(["limited", "consent_denied", "revoked", "disabled"]);
    const terminalIds = [data.acceptedEventIds, data.duplicateEventIds, data.droppedEventIds]
      .flatMap((value) => Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : []);
    const terminalIdSet = new Set(terminalIds.length ? terminalIds : batchIds);
    if (terminalStates.has(collectionState)) {
      saveQueue(queue().filter((event) => !batchIds.has(event.id)));
      if (collectionState === "limited") setItem(COLLECTION_PAUSE_KEY, Date.now() + 15 * 60 * 1000);
      if (collectionState === "disabled" || collectionState === "revoked" || collectionState === "consent_denied") {
        removeItem(PUBLIC_CONFIG_KEY); removeItem(COLLECTION_PAUSE_KEY);
        publicConfigVerifiedThisPage = false;
        configureMetaPixel(null);
      }
    } else {
      saveQueue(queue().filter((event) => !terminalIdSet.has(event.id)));
    }
    if (typeof data.attributionToken === "string") {
      setItem(ATTRIBUTION_TOKEN_KEY, { sessionId: session.id, token: data.attributionToken });
      if (!linkRequest && orderLinks().length) window.setTimeout(() => void retryMarketingOrderLinks(), 0);
    }
    if (typeof data.erasureToken === "string") saveErasureCapability(session.id, data.erasureToken);
    if (queue().some((event) => !batchIds.has(event.id))) window.setTimeout(() => void flush(), 0);
  } catch (error) {
    if (operationGeneration !== consentGeneration) return;
    const code = terminalFailure(error);
    if (code) {
      saveQueue(queue().filter((event) => !batchIds.has(event.id)));
      if (code === "permission-denied") {
        removeItem(PUBLIC_CONFIG_KEY); removeItem(COLLECTION_PAUSE_KEY);
        publicConfigVerifiedThisPage = false;
        configureMetaPixel(null);
      }
      return;
    }
    saveQueue(queue().map((event) => batchIds.has(event.id) ? { ...event, attempts: event.attempts + 1 } : event)
      .filter((event) => event.attempts <= MAX_RETRIES));
  }
}

export function setMarketingConsent(next: Pick<MarketingConsent, "analytics" | "marketing" | "metaAdvertising">): MarketingConsent {
  const previous = getMarketingState().consent;
  const normalized = {
    analytics: Boolean(next.analytics), marketing: Boolean(next.marketing),
    ...(next.metaAdvertising && canOfferMetaConsent() ? { metaAdvertising: true } : {}),
  };
  consentGeneration += 1;
  const consent: MarketingConsent = { ...normalized, revision: CONSENT_NOTICE_REVISION, updatedAt: isoNow() };
  const withdrawn = scopeReduced(previous, consent) || (!hasAnyMarketingPurpose(consent) && !previous);
  const purposeChanged = withdrawn || scopeReduced(consent, previous);
  if (withdrawn) {
    lastWithdrawalGeneration = consentGeneration;
    const session = getItem<StoredSession>(SESSION_KEY);
    const legacyToken = getItem<string>(ERASURE_KEY);
    if (session?.id && typeof legacyToken === "string") queueRevocation(session.id, legacyToken);
    for (const capability of capabilities(ERASURE_CAPABILITIES_KEY)) queueRevocation(capability.sessionId, capability.erasureToken);
    removeItem(ERASURE_CAPABILITIES_KEY);
    removeItem(ERASURE_KEY);
  }
  if (purposeChanged) {
    // Do not let a later order inherit a session or attribution created under
    // a broader purpose. The new choice starts with a fresh anonymous scope.
    removeItem(QUEUE_KEY); removeItem(ORDER_LINK_QUEUE_KEY); removeItem(SESSION_KEY); removeItem(VISITOR_KEY);
    removeItem(ATTRIBUTION_KEY); removeItem(ATTRIBUTION_TOKEN_KEY); removeItem(COLLECTION_PAUSE_KEY);
    pendingLanding = undefined;
    pendingMetaClick = undefined;
  }
  setItem(MARKETING_CONSENT_KEY, consent);
  if (!consent.metaAdvertising) configureMetaPixel(null, { withdraw: Boolean(previous?.metaAdvertising) });
  if (withdrawn) void retryPendingMarketingRevocation();
  window.dispatchEvent(new CustomEvent("delizza-marketing-consent", { detail: consent }));
  if (hasAnyMarketingPurpose(consent) && hasMarketingBuildConfiguration()) {
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
  if (!hasAnyMarketingPurpose(storedConsent) || !configuredSource || !hasMarketingBuildConfiguration()) return;
  if (storedConsent.marketing) pendingLanding = readLandingAttribution() ?? pendingLanding;
  if (storedConsent.metaAdvertising && canOfferMetaConsent()) pendingMetaClick = readMetaLandingClick() ?? pendingMetaClick;
  const operationGeneration = consentGeneration;
  try {
    const result = await invokeMarketingCallable("marketingPublicConfig", { appId: CLIENT_WL_APP_ID, sourceId: configuredSource });
    if (operationGeneration !== consentGeneration || !hasAnyMarketingPurpose(getMarketingState().consent)) return;
    const data = result.data as { enabled?: unknown; sourceId?: unknown; attributionWindowDays?: unknown; sessionRetentionDays?: unknown; consentRevision?: unknown; metaPixelId?: unknown };
    if (data.enabled !== true || data.sourceId !== configuredSource || !Number.isInteger(data.attributionWindowDays) || !Number.isInteger(data.sessionRetentionDays) || data.consentRevision !== CONSENT_NOTICE_REVISION || data.consentRevision !== storedConsent.revision) throw new Error("invalid public marketing config");
    const metaPixelId = typeof data.metaPixelId === "string" && /^\d{5,30}$/.test(data.metaPixelId) ? data.metaPixelId : undefined;
    setItem(PUBLIC_CONFIG_KEY, { enabled: true, windowDays: data.attributionWindowDays as number, retentionDays: data.sessionRetentionDays as number, revision: data.consentRevision, fetchedAt: isoNow(), metaPixelId } satisfies MarketingPublicConfig);
    publicConfigVerifiedThisPage = true;
    configureMetaPixel(storedConsent.metaAdvertising && canOfferMetaConsent() ? metaPixelId ?? null : null);
    if (storedConsent.analytics) {
      ensureSessionStartQueued();
    }
    void flush();
    window.dispatchEvent(new CustomEvent("delizza-marketing-config"));
  } catch {
    if (operationGeneration !== consentGeneration) return;
    // The backend is authoritative: an unavailable or rejected configuration disables collection.
    removeItem(PUBLIC_CONFIG_KEY); removeItem(COLLECTION_PAUSE_KEY);
    removeItem(QUEUE_KEY);
    publicConfigVerifiedThisPage = false;
    configureMetaPixel(null);
  }
}

export function recordMarketingEvent(
  type: MarketingEventType,
  detail: Omit<MarketingEvent, "id" | "type" | "occurredAt"> = {},
): void {
  const state = getMarketingState();
  if (!state.enabled || !hasAnyMarketingPurpose(state.consent)) return;
  if (state.consent.analytics && type !== "session_start") ensureSessionStartQueued();
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
  if (state.consent.marketing && type === "page_view") {
    const attribution = captureAttribution();
    if (attribution) {
      contextDirty = true;
      if (state.consent.analytics) {
        const events = queue();
        events.push({ id: uuid(), type: "campaign_visit", occurredAt: isoNow(), path: attribution.landingPath, attempts: 0 });
        saveQueue(events);
      }
    }
  }
  if (state.consent.analytics) {
    const events = queue();
    events.push(event);
    saveQueue(events);
  }
  if (state.consent.metaAdvertising) {
    const name = META_FUNNEL_EVENTS[type];
    if (name) {
      trackMetaPixel({ name, data: { ...(event.productId ? { content_ids: [event.productId], content_type: "product" } : {}), ...(event.quantity ? { num_items: event.quantity } : {}) } });
    }
  }
  void flush();
}

/** Queues an existing order without delaying order creation or payment. */
export function linkOrderMarketing(orderId: string): void {
  const state = getMarketingState();
  if (!state.enabled || !state.sourceId || !(state.consent?.marketing || state.consent?.metaAdvertising) || !orderId) return;
  const session = getOrCreateSession();
  if (!session) return;
  const links = orderLinks();
  const existing = links.find((entry) => entry.orderId === orderId);
  const metaPurchaseEventId = state.consent.metaAdvertising
    ? existing?.context.metaPurchaseEventId ?? createMetaPurchaseEventId()
    : undefined;
  if (!existing) {
    const token = storedAttributionToken(session.id);
    links.push({
      orderId,
      context: {
        sessionId: session.id,
        sourceId: state.sourceId,
        ...(token ? { attributionToken: token } : {}),
        ...(metaPurchaseEventId ? { metaPurchaseEventId } : {}),
      },
      attempts: 0,
      expiresAt: Date.now() + SESSION_MAX_AGE_MS,
    });
    saveOrderLinks(links);
  }
  void retryMarketingOrderLinks();
}

export function retryMarketingOrderLinks(): Promise<void> {
  if (linkRequest) return linkRequest;
  linkRequest = drainOrderLinks().finally(() => { linkRequest = null; });
  return linkRequest;
}

async function drainOrderLinks(): Promise<void> {
  const state = getMarketingState();
  if (!state.enabled || !state.sourceId || !(state.consent?.marketing || state.consent?.metaAdvertising) || !orderLinks().length) return;
  const generation = consentGeneration;
  await flush();
  if (queue().length) await flush();
  for (const entry of orderLinks()) {
    if (generation !== consentGeneration) return;
    const context = entry.context;
    if (context.sourceId !== state.sourceId || (entry.expiresAt !== undefined && entry.expiresAt <= Date.now())) {
      saveOrderLinks(orderLinks().filter((pending) => pending.orderId !== entry.orderId));
      continue;
    }
    const attributionToken = storedAttributionToken(context.sessionId) ?? context.attributionToken;
    try {
      const result = await invokeMarketingCallable("marketingLinkOrder", {
        appId: CLIENT_WL_APP_ID,
        orderId: entry.orderId,
        context: { ...context, ...(attributionToken ? { attributionToken } : {}) },
      });
      if (generation !== consentGeneration) return;
      const canonicalMetaPurchaseEventId = (result.data as { metaPurchaseEventId?: unknown } | undefined)?.metaPurchaseEventId;
      if (context.metaPurchaseEventId && typeof canonicalMetaPurchaseEventId === "string" && typeof entry.expiresAt === "number") {
        // Arm the browser Purchase only after the backend has accepted the
        // canonical opaque event ID. A cross-tab or replay can therefore not
        // replace an ID already persisted for the CAPI event.
        rememberMetaCheckout(entry.orderId, canonicalMetaPurchaseEventId, entry.expiresAt - SESSION_MAX_AGE_MS);
        window.dispatchEvent(new Event(META_PURCHASE_ARMED_EVENT));
      }
      saveOrderLinks(orderLinks().filter((pending) => pending.orderId !== entry.orderId));
    } catch (error) {
      if (generation !== consentGeneration) return;
      const terminal = terminalFailure(error);
      saveOrderLinks(orderLinks().flatMap((pending) => {
        if (pending.orderId !== entry.orderId) return [pending];
        return terminal || pending.attempts >= MAX_RETRIES ? [] : [{ ...pending, attempts: pending.attempts + 1 }];
      }));
    }
  }
}

function capabilities(key: string): RevocationCapability[] {
  const stored = getItem<RevocationCapability[] | RevocationCapability>(key);
  return (Array.isArray(stored) ? stored : stored ? [stored] : []).filter(
    (entry) => typeof entry?.sessionId === "string" && typeof entry.erasureToken === "string" && Date.parse(entry.expiresAt) > Date.now(),
  );
}

function upsertCapability(key: string, capability: RevocationCapability): void {
  const current = capabilities(key).filter((entry) => entry.sessionId !== capability.sessionId);
  setItem(key, [...current, capability].slice(-256));
}

function saveErasureCapability(sessionId: string, erasureToken: string): void {
  const expiresAt = new Date(Date.now() + (publicConfig()?.retentionDays ?? 1) * 86400000).toISOString();
  upsertCapability(ERASURE_CAPABILITIES_KEY, { sessionId, erasureToken, expiresAt });
}

function queueRevocation(sessionId: string, erasureToken: string): void {
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
  upsertCapability(PENDING_REVOCATION_KEY, { sessionId, erasureToken, expiresAt });
}

export function revokeMarketingConsent(): Promise<void> {
  setMarketingConsent({ analytics: false, marketing: false });
  return retryPendingMarketingRevocation();
}

/** Retries only the minimal server-erasure capability. */
export function retryPendingMarketingRevocation(): Promise<void> {
  if (revocationRequest) return revocationRequest;
  revocationRequest = drainRevocations().finally(() => { revocationRequest = null; });
  return revocationRequest;
}

async function drainRevocations(): Promise<void> {
  const configuredSource = sourceId();
  if (!configuredSource) return;
  const attempted = new Set<string>();
  for (;;) {
    const entry = capabilities(PENDING_REVOCATION_KEY).find((candidate) => !attempted.has(candidate.sessionId));
    if (!entry) return;
    attempted.add(entry.sessionId);
    try {
      await invokeMarketingCallable("marketingCollect", { schemaVersion: MARKETING_SCHEMA_VERSION, appId: CLIENT_WL_APP_ID, sourceId: configuredSource, action: "revoke", session: { id: entry.sessionId }, erasureToken: entry.erasureToken });
    } catch (error) {
      if (!terminalFailure(error)) continue;
    }
    setItem(PENDING_REVOCATION_KEY, capabilities(PENDING_REVOCATION_KEY).filter((other) => other.sessionId !== entry.sessionId));
  }
}

export function refreshMarketingConsentFromStorage(previousValue: string | null): void {
  consentGeneration += 1;
  publicConfigVerifiedThisPage = false;
  pendingLanding = undefined;
  pendingMetaClick = undefined;
  const { consent } = getMarketingState();
  try {
    const previous = previousValue ? JSON.parse(previousValue) as MarketingConsent | null : null;
    if (scopeReduced(previous, consent)) lastWithdrawalGeneration = consentGeneration;
  } catch { /* a corrupt previous preference carries no consent evidence */ }
  configureMetaPixel(null, { withdraw: !consent?.metaAdvertising });
  if (hasAnyMarketingPurpose(consent)) void loadMarketingPublicConfigAfterConsent();
}
