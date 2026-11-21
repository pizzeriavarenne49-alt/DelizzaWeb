/**
 * Firebase Admin SDK â€” server-side only (Next.js server components).
 *
 * Reads the same Firestore collections as the WLHORIZON Flutter admin:
 *   - wl_catalog_categories
 *   - wl_catalog_items
 *   - wl_offers
 *
 * Required env vars:
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY,
 *   FIREBASE_STORAGE_BUCKET, WL_APP_ID
 *
 * Initialization is lazy â€” the SDK is only set up on the first actual
 * database call, so importing this module during build does not fail when
 * credentials are absent.
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

let _db: Firestore | null = null;

const ISOLATED_MARKETING_PROJECT = "demo-acquisition-marketing";
const ISOLATED_PIZZA_DUO_PROJECT = "demo-web-duo";
const ISOLATED_HOMEPAGE_PROJECT = "demo-delizza-homepage";

function usesIsolatedMarketingFirestoreEmulator(): boolean {
  return (
    process.env.NEXT_PUBLIC_MARKETING_TEST_MODE === "true" &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ===
      ISOLATED_MARKETING_PROJECT &&
    process.env.FIREBASE_PROJECT_ID === ISOLATED_MARKETING_PROJECT &&
    process.env.FIRESTORE_EMULATOR_HOST === "127.0.0.1:9808"
  );
}

export function usesIsolatedPizzaDuoFirestoreEmulator(): boolean {
  if (process.env.NEXT_PUBLIC_PIZZA_DUO_LOCAL_EMULATOR !== "true") return false;
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? "";
  const valid = process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_ENABLE_PIZZA_DUO === "true" &&
    process.env.NEXT_PUBLIC_MARKETING_TEST_MODE !== "true" && process.env.NEXT_PUBLIC_HALLOWEEN_LOCAL !== "true" &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === ISOLATED_PIZZA_DUO_PROJECT &&
    process.env.FIREBASE_PROJECT_ID === ISOLATED_PIZZA_DUO_PROJECT &&
    process.env.WL_APP_ID === "d_lizza" && process.env.NEXT_PUBLIC_WL_APP_ID === "d_lizza" &&
    /^127\.0\.0\.1:[1-9]\d{0,4}$/.test(emulatorHost);
  if (!valid) throw new Error("Pizza Duo local requires the demo-web-duo project on the local Firestore emulator.");
  return true;
}

/** Explicitly isolated only test configuration for the homepage CMS contract. */
export function usesIsolatedHomepageFirestoreEmulator(): boolean {
  if (process.env.NEXT_PUBLIC_HOMEPAGE_TEST_MODE !== "true") return false;
  const valid = process.env.FIREBASE_PROJECT_ID === ISOLATED_HOMEPAGE_PROJECT &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === ISOLATED_HOMEPAGE_PROJECT &&
    process.env.WL_APP_ID === "d_lizza" && process.env.NEXT_PUBLIC_WL_APP_ID === "d_lizza" &&
    process.env.FIRESTORE_EMULATOR_HOST === "127.0.0.1:18291" &&
    ["127.0.0.1:19291", "http://127.0.0.1:19291"].includes(process.env.STORAGE_EMULATOR_HOST ?? "") &&
    !process.env.FIREBASE_CLIENT_EMAIL && !process.env.FIREBASE_PRIVATE_KEY;
  if (!valid) throw new Error("Homepage test mode requires the loopback demo-delizza-homepage emulators and no production credentials.");
  return true;
}

/**
 * Parse FIREBASE_PRIVATE_KEY from environment variable.
 *
 * Handles multiple formats commonly found in CI/CD and hosting platforms:
 *  1. JSON-escaped string with literal `\n` â†’ convert to real newlines
 *  2. Base64-encoded PEM (useful workaround for platforms that mangle newlines)
 *  3. Already-valid multi-line PEM string
 *  4. Keys wrapped in extraneous quotes from shell or Vercel UI
 */
function parsePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;

  // Strip surrounding quotes that some env managers add
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  // If it looks like base64 (no PEM header), try decoding
  if (!key.includes("-----BEGIN") && /^[A-Za-z0-9+/=\s]+$/.test(key)) {
    try {
      const decoded = Buffer.from(key, "base64").toString("utf-8");
      if (decoded.includes("-----BEGIN")) {
        key = decoded;
      }
    } catch {
      // Not valid base64 â€” fall through to normal handling
    }
  }

  // Replace literal `\n` sequences with real newlines
  key = key.replace(/\\n/g, "\n");

  // Validate the result looks like a PEM key
  if (!key.includes("-----BEGIN")) {
    console.warn(
      "[Firebase] FIREBASE_PRIVATE_KEY does not contain a valid PEM header. " +
        "Check that the environment variable is set correctly.",
    );
  }

  return key;
}

function usesHalloweenLocal(): boolean {
  if (process.env.NEXT_PUBLIC_HALLOWEEN_LOCAL !== "true") return false;
  if (process.env.NODE_ENV !== "development" || process.env.FIREBASE_PROJECT_ID !== "demo-halloween-local"
      || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== "demo-halloween-local"
      || process.env.WL_APP_ID !== "d_lizza" || process.env.NEXT_PUBLIC_WL_APP_ID !== "d_lizza"
      || process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:18880"
      || process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:19099") {
    throw new Error("Halloween local refuses non-emulator Firebase configuration.");
  }
  return true;
}

/** Lazily initialize Firebase Admin and return the Firestore client. */
export function getDb(): Firestore {
  const halloweenLocal = usesHalloweenLocal();
  if (halloweenLocal && getApps().some(app => app.options.projectId !== "demo-halloween-local")) throw new Error("Existing Firebase app is not the local project.");
  const pizzaDuoLocal = usesIsolatedPizzaDuoFirestoreEmulator();
  if (pizzaDuoLocal && getApps().some(app => app.options.projectId !== ISOLATED_PIZZA_DUO_PROJECT)) {
    throw new Error("An existing Firebase app is outside the local Pizza Duo project.");
  }
  const homepageLocal = usesIsolatedHomepageFirestoreEmulator();
  if (homepageLocal && getApps().some(app => app.options.projectId !== ISOLATED_HOMEPAGE_PROJECT)) throw new Error("Existing Firebase app is outside the homepage local project.");
  if (_db) return _db;
  const isolatedEmulator = halloweenLocal || usesIsolatedMarketingFirestoreEmulator() || pizzaDuoLocal || homepageLocal;
  let initializedHere = false;
  if (getApps().length === 0) {
    initializedHere = true;
    if (isolatedEmulator) {
      initializeApp({ projectId: halloweenLocal ? "demo-halloween-local" : pizzaDuoLocal ? ISOLATED_PIZZA_DUO_PROJECT : homepageLocal ? ISOLATED_HOMEPAGE_PROJECT : ISOLATED_MARKETING_PROJECT, storageBucket: process.env.FIREBASE_STORAGE_BUCKET });
    } else {
      const privateKey = parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
      if (!privateKey) {
        throw new Error(
          "[Firebase] FIREBASE_PRIVATE_KEY is missing or empty. " +
            "Cannot initialize Firebase Admin SDK.",
        );
      }
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
    }
  }
  _db = getFirestore();
  // Firestore Admin settings are immutable after first use. In Next dev HMR
  // this module can reload while the Firebase Admin app remains global.
  if (isolatedEmulator && initializedHere) {
    _db.settings({ host: halloweenLocal ? "127.0.0.1:18880" : pizzaDuoLocal ? (process.env.FIRESTORE_EMULATOR_HOST as string) : homepageLocal ? "127.0.0.1:18291" : "127.0.0.1:9808", ssl: false });
  }
  return _db;
}

export const WL_APP_ID = process.env.WL_APP_ID ?? "";
export const FIREBASE_STORAGE_BUCKET =
  process.env.FIREBASE_STORAGE_BUCKET ?? "";

/** The private promotion image is proxied by a route after schedule checks. */
export function getStorageBucket() {
  if (!FIREBASE_STORAGE_BUCKET) throw new Error("FIREBASE_STORAGE_BUCKET is missing");
  getDb();
  return getStorage().bucket(FIREBASE_STORAGE_BUCKET);
}
