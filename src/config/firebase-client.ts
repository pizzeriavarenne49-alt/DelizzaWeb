/**
 * Firebase Client SDK â€” browser-side only.
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
 *   NEXT_PUBLIC_RECAPTCHA_SITE_KEY â€” reCAPTCHA Enterprise site key for App Check (production)
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, type Functions } from "firebase/functions";
import {
  CustomProvider,
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from "firebase/app-check";
import { isLocalStripeTestEnabled } from "@/lib/demo-payment";

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

function halloweenLocalMode(): boolean { return process.env.NEXT_PUBLIC_HALLOWEEN_LOCAL === "true"; }
function assertHalloweenLocal(): void {
  const loopback = typeof window === "undefined" || ["127.0.0.1", "localhost", "::1"].includes(window.location.hostname);
  if (process.env.NODE_ENV !== "development" || !loopback || firebaseConfig.projectId !== "demo-halloween-local"
      || process.env.NEXT_PUBLIC_WL_APP_ID !== "d_lizza") {
    throw new Error("Halloween local refuses production, non-loopback hosts and unknown projects/tenants.");
  }
}

function getClientApp(): FirebaseApp {
  if (halloweenLocalMode()) assertHalloweenLocal();
  if (pizzaDuoLocalMode()) assertPizzaDuoLocal();
  if (getApps().length > 0) {
    const app = getApp();
    if (halloweenLocalMode() && app.options.projectId !== "demo-halloween-local") throw new Error("Existing Firebase app is not the local project.");
    if (pizzaDuoLocalMode() && app.options.projectId !== "demo-web-duo") throw new Error("Existing Firebase app is outside the local Pizza Duo project.");
    return app;
  }
  return initializeApp(firebaseConfig);
}

function marketingTestMode(): boolean {
  return process.env.NEXT_PUBLIC_MARKETING_TEST_MODE === "true";
}

function pizzaDuoLocalMode(): boolean {
  return process.env.NEXT_PUBLIC_PIZZA_DUO_LOCAL_EMULATOR === "true";
}

function assertPizzaDuoLocal(): void {
  const loopback = typeof window === "undefined" || ["127.0.0.1", "localhost", "::1"].includes(window.location.hostname);
  if (process.env.NODE_ENV !== "development" || !loopback || firebaseConfig.projectId !== "demo-web-duo" ||
      process.env.NEXT_PUBLIC_ENABLE_PIZZA_DUO !== "true" || halloweenLocalMode() || marketingTestMode() ||
      process.env.NEXT_PUBLIC_WL_APP_ID !== "d_lizza") {
    throw new Error("Pizza Duo local requires the demo-web-duo emulator on loopback for d_lizza.");
  }
}

function assertIsolatedMarketingEmulator(): void {
  if (!marketingTestMode()) return;
  if (firebaseConfig.projectId !== "demo-acquisition-marketing") {
    throw new Error("Marketing test mode requires NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-acquisition-marketing.");
  }
}

let authEmulatorConnected = false;
let firestoreEmulatorConnected = false;
let functionsEmulatorConnected = false;

const pizzaDuoLocalPorts = {
  auth: process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT,
  firestore: process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT,
  functions: process.env.NEXT_PUBLIC_FUNCTIONS_EMULATOR_PORT,
} as const;

function pizzaDuoLocalPort(kind: keyof typeof pizzaDuoLocalPorts, fallback: number): number {
  const raw = pizzaDuoLocalPorts[kind] ?? String(fallback);
  if (!/^[1-9]\d{0,4}$/.test(raw)) throw new Error(`Pizza Duo ${kind} emulator port must be valid.`);
  const port = Number(raw);
  if (!Number.isSafeInteger(port) || port > 65535) throw new Error(`Pizza Duo ${kind} emulator port must be valid.`);
  return port;
}

export function getClientAuth(): Auth {
  const auth = getAuth(getClientApp());
  if (halloweenLocalMode() && !authEmulatorConnected) {
    assertHalloweenLocal(); connectAuthEmulator(auth, "http://127.0.0.1:19099", { disableWarnings: true }); authEmulatorConnected = true;
  }
  if (marketingTestMode() && !authEmulatorConnected) {
    assertIsolatedMarketingEmulator();
    connectAuthEmulator(auth, "http://127.0.0.1:9909", { disableWarnings: true });
    authEmulatorConnected = true;
  }
  if (pizzaDuoLocalMode() && !authEmulatorConnected) {
    assertPizzaDuoLocal();
    connectAuthEmulator(auth, `http://127.0.0.1:${pizzaDuoLocalPort("auth", 19099)}`, { disableWarnings: true }); authEmulatorConnected = true;
  }
  return auth;
}

export function getClientFirestore(): Firestore {
  // Initialise before obtaining a service instance: public pages can open a
  // Firestore listener before AuthProvider's effect has had a chance to run.
  // App Check remains fail-closed in production when its site key is absent.
  initAppCheck();
  const firestore = getFirestore(getClientApp());
  if (halloweenLocalMode() && !firestoreEmulatorConnected) {
    assertHalloweenLocal(); connectFirestoreEmulator(firestore, "127.0.0.1", 18880); firestoreEmulatorConnected = true;
  }
  if (marketingTestMode() && !firestoreEmulatorConnected) {
    assertIsolatedMarketingEmulator();
    connectFirestoreEmulator(firestore, "127.0.0.1", 9808);
    firestoreEmulatorConnected = true;
  }
  if (pizzaDuoLocalMode() && !firestoreEmulatorConnected) {
    assertPizzaDuoLocal();
    connectFirestoreEmulator(firestore, "127.0.0.1", pizzaDuoLocalPort("firestore", 18887)); firestoreEmulatorConnected = true;
  }
  return firestore;
}

export function getClientFunctions(): Functions {
  // A first public Marketing callable can run before AuthProvider's effect.
  // Initialise App Check at this boundary so that Firebase has its token
  // provider before the callable client is created; do not relax enforcement
  // or synthesize an attestation when configuration is missing.
  initAppCheck();
  const functions = getFunctions(getClientApp(), "europe-west1");
  if (halloweenLocalMode() && !functionsEmulatorConnected) {
    assertHalloweenLocal(); connectFunctionsEmulator(functions, "127.0.0.1", 15001); functionsEmulatorConnected = true;
  }
  if (marketingTestMode() && !functionsEmulatorConnected) {
    assertIsolatedMarketingEmulator();
    connectFunctionsEmulator(functions, "127.0.0.1", 9501);
    functionsEmulatorConnected = true;
  }
  if (pizzaDuoLocalMode() && !functionsEmulatorConnected) {
    assertPizzaDuoLocal();
    connectFunctionsEmulator(functions, "127.0.0.1", pizzaDuoLocalPort("functions", 15501)); functionsEmulatorConnected = true;
  }
  return functions;
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
  if (typeof window === "undefined") return; // server-side â€” skip
  if (appCheckInstance) return; // already initialised
  if (halloweenLocalMode()) { assertHalloweenLocal(); return; }

  // Browser demonstrations and automated tests use the isolated emulator
  // project; never initialise a third-party App Check provider in that mode.
  if (marketingTestMode()) {
    assertIsolatedMarketingEmulator();
    return;
  }
  if (pizzaDuoLocalMode()) {
    assertPizzaDuoLocal();
    if (isLocalStripeTestEnabled()) {
      appCheckInstance = initializeAppCheck(getClientApp(), {
        provider: new CustomProvider({
          getToken: async () => ({
            token: "delizza-loopback-recette-v1",
            expireTimeMillis: Date.now() + 60 * 60 * 1000,
          }),
        }),
        isTokenAutoRefreshEnabled: false,
      });
    }
    return;
  }

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
