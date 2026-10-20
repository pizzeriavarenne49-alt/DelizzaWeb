import { doc, onSnapshot } from "firebase/firestore";
import { getClientFirestore, initAppCheck } from "@/config/firebase-client";

export interface HalloweenSettings {
  enabled: boolean;
  storm: boolean;
  ambience: boolean;
  autoScreamer: boolean;
}

export const HALLOWEEN_OFF: HalloweenSettings = Object.freeze({
  enabled: false, storm: false, ambience: false, autoScreamer: false,
});

export function resolveWebsiteTenant(serverAppId: string, serverProjectId: string): string | null {
  const browserAppId = process.env.NEXT_PUBLIC_WL_APP_ID;
  const browserProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  return /^[A-Za-z0-9_-]{1,50}$/.test(serverAppId) && serverAppId === browserAppId
    && !!serverProjectId && serverProjectId === browserProjectId ? serverAppId : null;
}

export function parseWebsiteSettings(value: unknown, appId: string): HalloweenSettings {
  if (!value || typeof value !== "object") return HALLOWEEN_OFF;
  const website = value as Record<string, unknown>;
  const seasonal = website.seasonal as Record<string, unknown> | undefined;
  const halloween = seasonal?.halloween as Record<string, unknown> | undefined;
  if (website.appId !== appId || website.available !== true || website.schemaVersion !== 1 || typeof website.revision !== "number"
      || !Number.isSafeInteger(website.revision) || website.revision < 1 || seasonal?.theme !== "halloween-v11" || !halloween
      || ["enabled", "storm", "ambience", "autoScreamer"].some(key => typeof halloween[key] !== "boolean")) {
    return HALLOWEEN_OFF;
  }
  const enabled = halloween.enabled === true;
  return {
    enabled, storm: enabled && halloween.storm === true,
    ambience: enabled && halloween.ambience === true,
    autoScreamer: enabled && halloween.autoScreamer === true,
  };
}

/** No HTTP/Next cache and no browser fallback capable of re-enabling stale effects. */
export function watchWebsiteSettings(appId: string, update: (value: HalloweenSettings) => void): () => void {
  if (!/^[A-Za-z0-9_-]{1,50}$/.test(appId) || appId !== process.env.NEXT_PUBLIC_WL_APP_ID) {
    update(HALLOWEEN_OFF); return () => {};
  }
  try {
    initAppCheck();
    return onSnapshot(doc(getClientFirestore(), "wl_public_apps", appId),
      { includeMetadataChanges: true }, snapshot => {
        update(snapshot.metadata.fromCache ? HALLOWEEN_OFF
          : parseWebsiteSettings(snapshot.data()?.publicConfig?.website, appId));
      }, () => update(HALLOWEEN_OFF));
  } catch {
    update(HALLOWEEN_OFF);
    return () => {};
  }
}
