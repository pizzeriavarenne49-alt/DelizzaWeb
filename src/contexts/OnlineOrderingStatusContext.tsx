"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  doc,
  onSnapshot,
  type DocumentData,
  type Timestamp,
} from "firebase/firestore";
import {
  CLIENT_WL_APP_ID,
  getClientFirestore,
} from "@/config/firebase-client";

export type OnlineOrderingStatus = "open" | "closed" | "emergency";

export interface OnlineOrderingState {
  appId: string;
  status: OnlineOrderingStatus;
  updatedAt: Date | null;
  effectiveAt: Date | null;
  serviceOpeningId: string | null;
  serviceDate: string | null;
  publicReason: string | null;
  loading: boolean;
  error: string | null;
  canStartOrder: boolean;
  isOpen: boolean;
  isClosed: boolean;
  isEmergency: boolean;
  message: string | null;
}

const ONLINE_ORDERING_CLOSED_MESSAGE =
  "Les commandes en ligne sont actuellement fermées.";
const ONLINE_ORDERING_EMERGENCY_MESSAGE =
  "Les commandes en ligne sont temporairement indisponibles. Merci de réessayer plus tard.";

const VALID_STATUSES = new Set<OnlineOrderingStatus>([
  "open",
  "closed",
  "emergency",
]);

const DEFAULT_ONLINE_ORDERING_STATE: OnlineOrderingState = {
  appId: CLIENT_WL_APP_ID,
  status: "open",
  updatedAt: null,
  effectiveAt: null,
  serviceOpeningId: null,
  serviceDate: null,
  publicReason: null,
  loading: true,
  error: null,
  canStartOrder: true,
  isOpen: true,
  isClosed: false,
  isEmergency: false,
  message: null,
};

const OnlineOrderingStatusContext = createContext<OnlineOrderingState>(DEFAULT_ONLINE_ORDERING_STATE);

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof (value as Timestamp).toDate === "function") {
    return (value as Timestamp).toDate();
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  return null;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeStatus(value: unknown): OnlineOrderingStatus {
  return typeof value === "string" && VALID_STATUSES.has(value as OnlineOrderingStatus)
    ? (value as OnlineOrderingStatus)
    : "open";
}

export function onlineOrderingMessageForStatus(
  status: OnlineOrderingStatus,
  publicReason?: string | null,
): string | null {
  if (status === "closed") {
    return publicReason || ONLINE_ORDERING_CLOSED_MESSAGE;
  }
  if (status === "emergency") {
    return publicReason || ONLINE_ORDERING_EMERGENCY_MESSAGE;
  }
  return null;
}

function buildState({
  appId,
  data,
  loading,
  error,
}: {
  appId: string;
  data?: DocumentData | null;
  loading: boolean;
  error: string | null;
}): OnlineOrderingState {
  const status = normalizeStatus(data?.status);
  const publicReason = optionalString(data?.publicReason);
  const message = onlineOrderingMessageForStatus(status, publicReason);

  return {
    appId,
    status,
    updatedAt: toDate(data?.updatedAt),
    effectiveAt: toDate(data?.effectiveAt ?? data?.updatedAt),
    serviceOpeningId: optionalString(data?.serviceOpeningId),
    serviceDate: optionalString(data?.serviceDate),
    publicReason,
    loading,
    error,
    canStartOrder: status === "open",
    isOpen: status === "open",
    isClosed: status === "closed",
    isEmergency: status === "emergency",
    message,
  };
}

export function OnlineOrderingStatusProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnlineOrderingState>(() =>
    buildState({
      appId: CLIENT_WL_APP_ID,
      data: null,
      loading: true,
      error: null,
    }),
  );

  useEffect(() => {
    const db = getClientFirestore();
    const ref = doc(db, "wl_online_ordering_status", CLIENT_WL_APP_ID);

    return onSnapshot(
      ref,
      (snapshot) => {
        setState(
          buildState({
            appId: CLIENT_WL_APP_ID,
            data: snapshot.exists() ? snapshot.data() : null,
            loading: false,
            error: null,
          }),
        );
      },
      (error) => {
        console.error("[online-ordering-status] realtime listener failed:", error);
        setState(
          buildState({
            appId: CLIENT_WL_APP_ID,
            data: null,
            loading: false,
            error: error.message,
          }),
        );
      },
    );
  }, []);

  const value = useMemo(() => state, [state]);

  return (
    <OnlineOrderingStatusContext.Provider value={value}>
      {children}
    </OnlineOrderingStatusContext.Provider>
  );
}

export function useOnlineOrderingStatus(): OnlineOrderingState {
  return useContext(OnlineOrderingStatusContext);
}
