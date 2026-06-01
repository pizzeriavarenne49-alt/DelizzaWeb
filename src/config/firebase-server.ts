/**
 * Firebase Server SDK — server-side only.
 *
 * Used for:
 *   - Firestore document access (webhook, server functions)
 *   - Admin operations
 *
 * Requires env vars:
 *   - FIREBASE_PROJECT_ID
 *   - FIREBASE_CLIENT_EMAIL (optional, for service account)
 *   - FIREBASE_PRIVATE_KEY (optional, for service account)
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
};

export function getServerApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

export { getFirestore } from "firebase/firestore";

/**
 * Get Firestore instance for server-side operations.
 * Lazy-initializes Firebase if needed.
 */
export function getServerFirestore() {
  const { getFirestore } = require("firebase/firestore");
  return getFirestore(getServerApp());
}
