/**
 * Smart redirect helpers.
 * For now all CTAs redirect to /go?trigger=<action> which itself
 * redirects to /download. Deep-link URLs are placeholders.
 */

import type { Platform } from "@/types";

const DISMISS_KEY = "delizza_app_banner_dismissed";
const DISMISS_DAYS = 7;

/** Deep link scheme */
const DEEP_LINK_SCHEME = "com.wlhorizon.delizza://";

/** Store URLs — all point to /download (coming soon) */
const STORE_URLS: Record<Platform, string> = {
  ios: "/download",
  android: "/download",
  desktop: "/download",
};

export function buildGoUrl(
  trigger: string,
  utmParams?: Record<string, string>,
): string {
  const params = new URLSearchParams({ trigger });
  if (utmParams) {
    Object.entries(utmParams).forEach(([k, v]) => params.set(k, v));
  }
  return `/go?${params.toString()}`;
}

export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

export function getDeepLink(trigger: string): string {
  return `${DEEP_LINK_SCHEME}action?trigger=${encodeURIComponent(trigger)}`;
}

export function getStoreUrl(platform: Platform): string {
  return STORE_URLS[platform];
}

export function isBannerDismissed(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export function dismissBanner(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DISMISS_KEY, String(Date.now()));
}
