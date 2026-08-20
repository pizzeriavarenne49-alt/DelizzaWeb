"use client";

import {
  getIdTokenResult,
  type IdTokenResult,
  type User,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import {
  CLIENT_WL_APP_ID,
  getClientAuth,
  getClientFunctions,
} from "@/config/firebase-client";

export const DELIZZA_CUSTOMER_APP_ID = CLIENT_WL_APP_ID;
const ASSIGN_CUSTOMER_TO_APP_FN = "assignCustomerToApp";

const CUSTOMER_SESSION_SYNC_MESSAGE =
  "Votre session client n'est pas synchronisée. Actualisez la page ou reconnectez-vous.";

export class CustomerSessionSyncError extends Error {
  override name = "CustomerSessionSyncError";
  readonly code = "customer-session-sync";

  constructor(message = CUSTOMER_SESSION_SYNC_MESSAGE, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

function readCustomerAppId(claims: Record<string, unknown>): string | null {
  const value = claims.customerAppId;
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function isMissingCallableError(error: unknown): boolean {
  const text = typeof error === "object" && error !== null
    ? [
        (error as { code?: unknown }).code,
        (error as { message?: unknown }).message,
        (error as { name?: unknown }).name,
      ]
        .filter((value): value is string => typeof value === "string")
        .join(" ")
        .toLowerCase()
    : "";

  return [
    "not-found",
    "not found",
    "unimplemented",
    "404",
    "functions/not-found",
  ].some((token) => text.includes(token));
}

export interface CustomerSessionProfileInput {
  displayName?: string;
  phone?: string;
}

async function attemptAssignCustomerToApp(profile?: CustomerSessionProfileInput): Promise<void> {
  const functions = getClientFunctions();
  const callable = httpsCallable(functions, ASSIGN_CUSTOMER_TO_APP_FN);
  await callable({
    appId: DELIZZA_CUSTOMER_APP_ID,
    ...(profile?.displayName ? { displayName: profile.displayName } : {}),
    ...(profile?.phone ? { phone: profile.phone } : {}),
  });
}

function createSyncError(cause?: unknown): CustomerSessionSyncError {
  return new CustomerSessionSyncError(CUSTOMER_SESSION_SYNC_MESSAGE, cause);
}

export async function ensureDelizzaCustomerSession(
  allowResync = true,
  profile?: CustomerSessionProfileInput,
): Promise<{
  user: User;
  idToken: string;
  tokenResult: IdTokenResult;
  customerAppId: string;
}> {
  const auth = getClientAuth();
  const user = auth.currentUser;

  if (!user) {
    throw createSyncError(new Error("No authenticated user."));
  }

  const refreshSession = async (): Promise<{
    idToken: string;
    tokenResult: IdTokenResult;
    customerAppId: string | null;
  }> => {
    const idToken = await user.getIdToken(true);
    const tokenResult = await getIdTokenResult(user, true);
    return {
      idToken,
      tokenResult,
      customerAppId: readCustomerAppId(tokenResult.claims as Record<string, unknown>),
    };
  };

  let session = await refreshSession();
  if (session.customerAppId === DELIZZA_CUSTOMER_APP_ID) {
    return {
      user,
      idToken: session.idToken,
      tokenResult: session.tokenResult,
      customerAppId: session.customerAppId,
    };
  }

  let resyncCause: unknown = null;
  if (allowResync) {
    try {
      await attemptAssignCustomerToApp(profile);
    } catch (error) {
      if (!isMissingCallableError(error)) {
        resyncCause = error;
      }
    }

    session = await refreshSession();
    if (session.customerAppId === DELIZZA_CUSTOMER_APP_ID) {
      return {
        user,
        idToken: session.idToken,
        tokenResult: session.tokenResult,
        customerAppId: session.customerAppId,
      };
    }
  }

  throw createSyncError(resyncCause ?? new Error("customerAppId claim missing."));
}

export async function syncDelizzaCustomerProfile(profile: CustomerSessionProfileInput): Promise<void> {
  const auth = getClientAuth();
  if (!auth.currentUser) {
    throw createSyncError(new Error("No authenticated user."));
  }
  await attemptAssignCustomerToApp(profile);
  await auth.currentUser.getIdToken(true);
}
