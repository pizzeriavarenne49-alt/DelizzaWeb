/**
 * Firebase Admin SDK — server-side only (Next.js server components).
 *
 * Reads the same Firestore collections as the WLHORIZON Flutter admin:
 *   - wl_catalog_categories
 *   - wl_catalog_items
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

/** Lazily initialize Firebase Admin and return the Firestore client. */
export function getDb(): Firestore {
  if (_db) return _db;
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
  _db = getFirestore();
  return _db;
}

export const WL_APP_ID = process.env.WL_APP_ID ?? "";
export const FIREBASE_STORAGE_BUCKET =
  process.env.FIREBASE_STORAGE_BUCKET ?? "";
