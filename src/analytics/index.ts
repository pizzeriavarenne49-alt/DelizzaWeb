/**
 * Internal analytics module for Pizza Deli'Zza.
 *
 * Logs events to the console for now. The API is stable so a real
 * backend (Mixpanel, Amplitude, custom) can be wired in later without
 * touching call-sites.
 */

/* ------------------------------------------------------------------ */
/*  Event catalogue                                                    */
/* ------------------------------------------------------------------ */

export type AnalyticsEvent =
  | { name: "view_home" }
  | { name: "view_menu" }
  | { name: "view_offers" }
  | { name: "view_profile" }
  | { name: "view_download"; payload?: { from?: string } }
  | { name: "click_hero_cta"; payload: { slideId: string } }
  | { name: "click_add_product"; payload: { productId: string } }
  | { name: "click_menu" }
  | { name: "click_offers" }
  | { name: "open_go"; payload: { trigger: string; os: string } }
  | { name: "close_install_banner" }
  | { name: "show_install_banner"; payload?: { reason: string } };

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Track an analytics event.
 *
 * ```ts
 * track({ name: "click_hero_cta", payload: { slideId: "slide1" } });
 * ```
 */
export function track(event: AnalyticsEvent): void {
  if (typeof window === "undefined") return;

  const ts = new Date().toISOString();
  const { name, ...rest } = event;
  const payload = "payload" in rest ? rest.payload : undefined;

  // Log with colored prefix for easy console filtering
  console.log(
    `%c[analytics] %c${name}`,
    "color:#D4A053;font-weight:bold",
    "color:#F5F5F5;font-weight:normal",
    payload ?? "",
    `@ ${ts}`,
  );

  // TODO: replace with a real transport
  // fetch("/api/analytics", { method: "POST", body: JSON.stringify({ name, payload, ts }) });
}
