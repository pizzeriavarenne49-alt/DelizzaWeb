"use client";

export type MetaEventName = "PageView" | "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase";
type MetaEvent = { name: MetaEventName; data?: Record<string, unknown>; eventId?: string };
type MetaPixel = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  push?: (...args: unknown[]) => void;
  loaded?: boolean;
  version?: string;
  disablePushState?: boolean;
  queue: unknown[][];
};
type PixelWindow = Window & { fbq?: MetaPixel; _fbq?: MetaPixel };

const PURCHASE_KEY = "delizza_meta_checkout_v1";
export const META_PURCHASE_ARMED_EVENT = "delizza-meta-purchase-armed";
const CLICK_KEY = "delizza_meta_click_v1";
const PURCHASE_TTL_MS = 60 * 60 * 1000;
const CLICK_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const SAFE_PARAMETERS = new Map([
  ["utm_id", /^\d{5,30}$/],
  ["utm_source", /^(?:meta|facebook|instagram|fb|ig)$/i],
  ["utm_medium", /^(?:paid_social|cpc)$/i],
  ["fbclid", /^[A-Za-z0-9_-]{1,250}$/],
]);

let pixelId: string | null = null;
let initializedPixelId: string | null = null;
let ownedPixel: MetaPixel | null = null;
let script: HTMLScriptElement | null = null;
let loaded = false;
let pending: MetaEvent[] = [];

export function metaAdvertisingAvailable(): boolean {
  return process.env.NEXT_PUBLIC_META_ADVERTISING_ENABLED === "true";
}

function canSendFrom(url: URL, purchase = false): boolean {
  if (url.protocol !== "https:" || url.username || url.password || url.hash ||
    /^\/(?:auth|profile|account|mon-compte|reset-password|login)(?:\/|$)/.test(url.pathname)) return false;
  if (purchase && url.search) return false;
  if (!purchase && /^\/order-confirmation\/?$/.test(url.pathname)) return false;
  for (const [key, value] of url.searchParams) {
    if (!SAFE_PARAMETERS.get(key)?.test(value)) return false;
  }
  return true;
}

function canSendHere(purchase = false): boolean {
  if (typeof window === "undefined") return false;
  const current = new URL(window.location.href);
  if (!canSendFrom(current, purchase)) return false;
  // The Pixel may automatically read the page and referrer URLs. Do not load
  // it on URLs carrying Stripe redirect details, account data or unknown parameters.
  if (!document.referrer) return true;
  try {
    const referrer = new URL(document.referrer);
    return canSendFrom(referrer) && (referrer.origin === current.origin || referrer.href === `${referrer.origin}/`);
  } catch { return false; }
}

function removeTrackingStorage(): void {
  try { window.localStorage.removeItem(CLICK_KEY); window.sessionStorage.removeItem(PURCHASE_KEY); } catch { /* optional storage */ }
  const labels = window.location.hostname.split(".");
  for (const name of ["_fbp", "_fbc"]) {
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax; Secure`;
    for (let index = 0; index < labels.length - 1; index += 1) {
      document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${labels.slice(index).join(".")}; SameSite=Lax; Secure`;
    }
  }
}

export function configureMetaPixel(id: string | null, { withdraw = false } = {}): void {
  if (typeof window === "undefined") return;
  const next = metaAdvertisingAvailable() && id && /^\d{5,30}$/.test(id) ? id : null;
  if (next !== pixelId) {
    pending = [];
    if (ownedPixel && loaded) ownedPixel("consent", next ? "grant" : "revoke");
    pixelId = next;
  }
  if (withdraw && (metaAdvertisingAvailable() || ownedPixel)) removeTrackingStorage();
}

function dispatch(event: MetaEvent): void {
  if (!pixelId || !ownedPixel || !loaded || !canSendHere(event.name === "Purchase")) return;
  if (initializedPixelId !== pixelId) {
    ownedPixel("set", "autoConfig", false, pixelId);
    ownedPixel("init", pixelId);
    // Keep the SDK's automatic PageView on cached-page restore from bypassing our URL checks.
    ownedPixel("set", "trackSingleOnly", true, pixelId);
    initializedPixelId = pixelId;
  }
  ownedPixel("trackSingle", pixelId, event.name, event.data ?? {}, ...(event.eventId ? [{ eventID: event.eventId }] : []));
}

export function trackMetaPixel(event: MetaEvent): boolean {
  if (!pixelId || !canSendHere(event.name === "Purchase")) return false;
  if (loaded) { dispatch(event); return true; }
  if (!script) {
    const browser = window as PixelWindow;
    if (browser.fbq && browser.fbq !== ownedPixel) return false;
    const queue: MetaPixel = Object.assign((...args: unknown[]) => {
      if (queue.callMethod) queue.callMethod(...args);
      else queue.queue.push(args);
    }, { loaded: true, version: "2.0", disablePushState: true, queue: [] as unknown[][] });
    queue.push = queue;
    browser.fbq = browser._fbq = ownedPixel = queue;
    script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    script.onload = () => {
      loaded = true;
      const events = pending;
      pending = [];
      for (const queued of events) dispatch(queued);
    };
    script.onerror = () => {
      script?.remove();
      script = null;
      pending = [];
    };
    pending.push(event);
    document.head.appendChild(script);
    return true;
  }
  if (pending.length >= 20) return false;
  pending.push(event);
  return true;
}

function readCookie(name: "_fbp" | "_fbc"): string | undefined {
  const pair = (document.cookie || "").split(";").map((entry) => entry.trim()).find((entry) => entry.startsWith(`${name}=`));
  const value = pair?.slice(name.length + 1);
  return value && /^fb\.\d\.\d{10,14}\.[A-Za-z0-9_-]{1,250}$/.test(value) ? value : undefined;
}

/** Captured in memory only after an explicit Meta opt-in. */
export function readMetaLandingClick(): string | undefined {
  if (!canSendHere()) return undefined;
  const click = new URLSearchParams(window.location.search).get("fbclid");
  return click && /^[A-Za-z0-9_-]{1,250}$/.test(click) ? click : undefined;
}

/** Called only after the source and explicit Meta consent have been verified. */
export function readMetaMatchContext(landingClick?: string): { fbp?: string; fbc?: string } | undefined {
  if (!pixelId || !canSendHere()) return undefined;
  const click = readMetaLandingClick() ?? landingClick;
  const fbp = readCookie("_fbp");
  const cookieFbc = readCookie("_fbc");
  let fbc = cookieFbc;
  try {
    const stored = window.localStorage.getItem(CLICK_KEY);
    const match = stored?.match(/^fb\.1\.(\d{13})\.([A-Za-z0-9_-]{1,250})$/);
    const validStored = match && Date.now() - Number(match[1]) >= 0 && Date.now() - Number(match[1]) < CLICK_TTL_MS;
    if (click && /^[A-Za-z0-9_-]{1,250}$/.test(click)) {
      fbc = cookieFbc?.endsWith(`.${click}`) ? cookieFbc : stored && validStored && match[2] === click ? stored : `fb.1.${Date.now()}.${click}`;
      window.localStorage.setItem(CLICK_KEY, fbc);
    } else if (stored && validStored && !cookieFbc) {
      fbc = stored;
    }
  } catch { /* a blocked storage API never blocks browsing */ }
  return fbp || fbc ? { ...(fbp ? { fbp } : {}), ...(fbc ? { fbc } : {}) } : undefined;
}

export function createMetaPurchaseEventId(): string | undefined {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") return undefined;
  return `meta-${crypto.randomUUID()}`;
}

function validMetaPurchaseEventId(value: unknown): value is string {
  return typeof value === "string" && /^meta-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function rememberMetaCheckout(orderId: string, eventId: string, checkoutAt: number): void {
  if (!pixelId) return;
  if (!validMetaPurchaseEventId(eventId) || !Number.isFinite(checkoutAt)) return;
  try {
    const existing = JSON.parse(window.sessionStorage.getItem(PURCHASE_KEY) ?? "null") as { orderId?: unknown; eventId?: unknown } | null;
    if (existing?.orderId === orderId && existing.eventId === eventId) return;
    window.sessionStorage.setItem(PURCHASE_KEY, JSON.stringify({ orderId, eventId, at: checkoutAt }));
  } catch { /* optional storage */ }
}

export function trackMetaPaidOrder(appId: string, orderId: string, order: Record<string, unknown>): void {
  const { status, paymentStatus, remainingTotalCents, paidTotalCents, totalCents, refundedTotalCents, paidAt } = order;
  // Stripe creates EUR intents when the canonical web order has no currency field.
  const currency = typeof order.currency === "string" ? order.currency.toUpperCase() : order.primaryPaymentProvider === "stripe" ? "EUR" : null;
  const paidAtMs = paidAt && typeof paidAt === "object" && "toMillis" in paidAt && typeof paidAt.toMillis === "function" ? paidAt.toMillis() : null;
  if (!pixelId || order.appId !== appId || order.source !== "web" || paymentStatus !== "paid" ||
    order.primaryPaymentProvider !== "stripe" || order.paymentReconciliationStatus !== "reconciled" || remainingTotalCents !== 0 ||
    (typeof status === "string" && /^(?:cancelled|canceled|expired|void|voided|refunded)$/i.test(status)) ||
    typeof paidTotalCents !== "number" || !Number.isSafeInteger(paidTotalCents) || paidTotalCents <= 0 || totalCents !== paidTotalCents ||
    (refundedTotalCents != null && refundedTotalCents !== 0) || !currency || !/^[A-Z]{3}$/.test(currency) ||
    typeof paidAtMs !== "number" || !Number.isFinite(paidAtMs)) return;
  try {
    const marker = JSON.parse(window.sessionStorage.getItem(PURCHASE_KEY) ?? "null") as { orderId: string; eventId: unknown; at: number; sent?: unknown } | null;
    if (!marker || marker.sent === true || marker.orderId !== orderId || !validMetaPurchaseEventId(marker.eventId) || !Number.isFinite(marker.at) || marker.at > Date.now() || Date.now() - marker.at >= PURCHASE_TTL_MS || paidAtMs < marker.at - 5_000) return;
    if (trackMetaPixel({ name: "Purchase", data: { value: paidTotalCents / 100, currency }, eventId: marker.eventId })) {
      window.sessionStorage.setItem(PURCHASE_KEY, JSON.stringify({ ...marker, sent: true }));
    }
  } catch { /* optional storage */ }
}
