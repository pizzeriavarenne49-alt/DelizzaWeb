/** Strictly local capture-mode payment guard. It is intentionally independent
 * from a catalog flag so it cannot be enabled by production data. */
function isIsolatedLocalCheckout(): boolean {
  if (process.env.NODE_ENV !== "development" ||
      process.env.NEXT_PUBLIC_PIZZA_DUO_LOCAL_EMULATOR !== "true" ||
      process.env.NEXT_PUBLIC_ENABLE_PIZZA_DUO !== "true" ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== "demo-web-duo" ||
      process.env.NEXT_PUBLIC_WL_APP_ID !== "d_lizza") return false;
  return typeof window !== "undefined" && ["127.0.0.1", "localhost", "::1"].includes(window.location.hostname);
}

export function isLocalStripeTestEnabled(): boolean {
  return isIsolatedLocalCheckout() &&
    process.env.NEXT_PUBLIC_DELIZZA_LOCAL_STRIPE_TEST === "true" &&
    window.location.origin === "http://127.0.0.1:3307";
}

export function isDemoPaymentEnabled(): boolean {
  return isIsolatedLocalCheckout() && process.env.NEXT_PUBLIC_DELIZZA_LOCAL_STRIPE_TEST !== "true";
}
