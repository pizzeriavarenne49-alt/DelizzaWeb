/**
 * Firebase Client SDK — browser-side only.
 *
 * Used for Auth, Firestore (client reads), and Cloud Functions calls.
 *
 * Required env vars (NEXT_PUBLIC_ prefix so they are exposed to the browser):
 *   NEXT_PUBLIC_FIREBASE_API_KEY
 *   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
 *   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
 *   NEXT_PUBLIC_FIREBASE_APP_ID
 *
 * Optional env vars:
 *   NEXT_PUBLIC_RECAPTCHA_SITE_KEY — reCAPTCHA Enterprise site key for App Check (production)
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, type Functions } from "firebase/functions";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from "firebase/app-check";

declare global {
  interface Window {
    FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string;
  }
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const CLIENT_WL_APP_ID =
  process.env.NEXT_PUBLIC_WL_APP_ID ?? process.env.WL_APP_ID ?? "d_lizza";

function getClientApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

export function getClientAuth(): Auth {
  return getAuth(getClientApp());
}

export function getClientFirestore(): Firestore {
  return getFirestore(getClientApp());
}

export function getClientFunctions(): Functions {
  return getFunctions(getClientApp(), "europe-west1");
}

let appCheckInstance: AppCheck | null = null;

function isLocalDevelopmentHost(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NODE_ENV !== "development") return false;

  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "::1"
  );
}

/**
 * Initialise Firebase App Check (browser-only, idempotent).
 *
 * Requires NEXT_PUBLIC_RECAPTCHA_SITE_KEY to be set with your reCAPTCHA
 * Enterprise site key.
 *
 * In local development on localhost, App Check debug mode is enabled before
 * initialisation. The printed debug token must be registered in Firebase
 * Console for calls to App-Check-protected production Functions.
 */
export function initAppCheck(): void {
  if (typeof window === "undefined") return; // server-side — skip
  if (appCheckInstance) return; // already initialised

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const debugToken = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN;

  if (!siteKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[AppCheck] NEXT_PUBLIC_RECAPTCHA_SITE_KEY is required in production.",
      );
    }
    console.warn(
      "[AppCheck] NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set - " +
        "App Check is disabled in development.",
    );
    return;
  }

  if (isLocalDevelopmentHost()) {
    window.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken || true;
  }

  appCheckInstance = initializeAppCheck(getClientApp(), {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
}
