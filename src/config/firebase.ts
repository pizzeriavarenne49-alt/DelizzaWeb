/**
 * Firebase Admin SDK — server-side only (Next.js server components).
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
 * Initialization is lazy — the SDK is only set up on the first actual
 * database call, so importing this module during build does not fail when
 * credentials are absent.
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let _db: Firestore | null = null;

const ISOLATED_MARKETING_PROJECT = "demo-acquisition-marketing";

function usesIsolatedMarketingFirestoreEmulator(): boolean {
  return (
    process.env.NEXT_PUBLIC_MARKETING_TEST_MODE === "true" &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ===
      ISOLATED_MARKETING_PROJECT &&
    process.env.FIREBASE_PROJECT_ID === ISOLATED_MARKETING_PROJECT &&
    process.env.FIRESTORE_EMULATOR_HOST === "127.0.0.1:9808"
  );
}

/**
 * Parse FIREBASE_PRIVATE_KEY from environment variable.
 *
 * Handles multiple formats commonly found in CI/CD and hosting platforms:
 *  1. JSON-escaped string with literal `\n` → convert to real newlines
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
      // Not valid base64 — fall through to normal handling
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

/** Lazily initialize Firebase Admin and return the Firestore client. */
export function getDb(): Firestore {
  if (_db) return _db;
  const isolatedEmulator = usesIsolatedMarketingFirestoreEmulator();
  let initializedHere = false;
  if (getApps().length === 0) {
    initializedHere = true;
    if (isolatedEmulator) {
      initializeApp({ projectId: ISOLATED_MARKETING_PROJECT });
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
      });
    }
  }
  _db = getFirestore();
  // Firestore Admin settings are immutable after first use. In Next dev HMR
  // this module can reload while the Firebase Admin app remains global.
  if (isolatedEmulator && initializedHere) {
    _db.settings({ host: "127.0.0.1:9808", ssl: false });
  }
  return _db;
}

export const WL_APP_ID = process.env.WL_APP_ID ?? "";
export const FIREBASE_STORAGE_BUCKET =
  process.env.FIREBASE_STORAGE_BUCKET ?? "";
