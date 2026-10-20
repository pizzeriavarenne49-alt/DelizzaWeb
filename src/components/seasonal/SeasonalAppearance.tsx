"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { HALLOWEEN_OFF, resolveWebsiteTenant, watchWebsiteSettings, type HalloweenSettings } from "@/services/website-settings";

const HalloweenOverlay = dynamic(() => import("./HalloweenOverlay"), { ssr: false });

/** The registry deliberately contains only the one integrated, trusted theme. */
export default function SeasonalAppearance({ serverAppId, serverProjectId }: { serverAppId: string; serverProjectId: string }) {
  const appId = resolveWebsiteTenant(serverAppId, serverProjectId);
  const pathname = usePathname();
  const [received, setReceived] = useState<{ appId: string | null; value: HalloweenSettings }>({ appId: null, value: HALLOWEEN_OFF });
  // Never render a previous tenant's snapshot while a new subscription starts.
  const settings = received.appId === appId ? received.value : HALLOWEEN_OFF;
  const [blocked, setBlocked] = useState(true);
  const [reduced, setReduced] = useState(true);
  const eligible = ["/", "/menu", "/offers"].includes(pathname);

  useEffect(() => {
    if (!appId) return;
    let active = true;
    const update = (value: HalloweenSettings) => { if (active) setReceived({ appId, value }); };
    update(HALLOWEEN_OFF);
    let stop = watchWebsiteSettings(appId, update);
    const offline = () => update(HALLOWEEN_OFF);
    const online = () => { stop(); stop = watchWebsiteSettings(appId, update); };
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => { active = false; stop(); window.removeEventListener("offline", offline); window.removeEventListener("online", online); };
  }, [appId]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!settings.enabled || !eligible) return;
    const update = () => setBlocked(document.visibilityState !== "visible"
      || !!document.querySelector('[data-seasonal-suspend], [role="dialog"], [aria-modal="true"], dialog[open]')
      || !!document.activeElement?.matches('input,textarea,select,[contenteditable="true"]')
      || !!document.activeElement?.closest('form'));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["open", "role", "aria-modal", "data-seasonal-suspend"] });
    document.addEventListener("visibilitychange", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
    };
  }, [settings.enabled, eligible]);

  return appId && settings.enabled && eligible
    ? <HalloweenOverlay key={appId} appId={appId} settings={settings} reducedMotion={reduced} suspended={blocked} /> : null;
}
