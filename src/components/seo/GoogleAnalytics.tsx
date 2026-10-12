"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getMarketingState } from "@/marketing/marketing-client";

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;

function clearGaCookies(): void {
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0]?.trim();
    if (!name || (!name.startsWith("_ga") && !name.startsWith("_gid"))) continue;
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
    const labels = window.location.hostname.split(".");
    for (let index = 0; index < labels.length - 1; index += 1) {
      document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.${labels.slice(index).join(".")}; SameSite=Lax`;
    }
  }
}

function gtag(..._args: unknown[]): void {
  const target = window as Window & { dataLayer?: unknown[] };
  target.dataLayer ??= [];
  // Match the official gtag queue: each call stores its Arguments object until
  // gtag.js consumes it, rather than an application-specific array shape.
  target.dataLayer.push(arguments as unknown);
}

function cleanPageLocation(pathname: string): string {
  return `${window.location.origin}${pathname.startsWith("/") ? pathname : "/"}`;
}

/** Loads GA4 only after the optional audience-measurement consent is granted. */
export default function GoogleAnalytics() {
  const [allowed, setAllowed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!GA4_ID) return;
    const update = () => {
      const next = Boolean(getMarketingState().consent?.analytics);
      setAllowed(next);
      if (!next) {
        (window as unknown as Record<string, unknown>)[`ga-disable-${GA4_ID}`] = true;
        gtag("consent", "update", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
        clearGaCookies();
      }
    };
    update();
    window.addEventListener("delizza-marketing-consent", update);
    return () => window.removeEventListener("delizza-marketing-consent", update);
  }, []);

  useEffect(() => {
    if (!GA4_ID || !allowed) return;
    (window as unknown as Record<string, unknown>)[`ga-disable-${GA4_ID}`] = false;
    gtag("consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    gtag("consent", "update", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_ID)}`;
    script.dataset.delizzaGa4 = "true";
    document.head.appendChild(script);
    gtag("js", new Date());
    gtag("config", GA4_ID, { send_page_view: false, anonymize_ip: true, allow_google_signals: false, allow_ad_personalization_signals: false });
    return () => script.remove();
  }, [allowed]);

  useEffect(() => {
    if (!GA4_ID || !allowed) return;
    gtag("event", "page_view", {
      page_location: cleanPageLocation(pathname || "/"),
      page_referrer: document.referrer ? new URL(document.referrer).origin : undefined,
    });
  }, [allowed, pathname]);

  return null;
}
