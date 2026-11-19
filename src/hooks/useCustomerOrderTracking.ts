"use client";

import { useEffect, useState } from "react";
import { getCustomerOrderTracking } from "@/lib/customer-order-presentation";
import { isValidTrackingOrderId, watchCustomerOrder, type CustomerOrderTrackingState } from "@/services/customer-order-tracking";

const INITIAL: CustomerOrderTrackingState = { order: null, syncState: "syncing", error: null };

export function useCustomerOrderTracking(orderId: string | null, uid: string | null) {
  const key = uid && isValidTrackingOrderId(orderId) ? `${uid}:${orderId}` : null;
  const [snapshot, setSnapshot] = useState<{ key: string; state: CustomerOrderTrackingState } | null>(null);
  const [offline, setOffline] = useState(false);
  const [delayedKey, setDelayedKey] = useState<string | null>(null);
  const state = key && snapshot?.key === key ? snapshot.state : INITIAL;

  useEffect(() => {
    if (!key || !orderId || !uid) return;
    return watchCustomerOrder(orderId, uid, (next) => setSnapshot({ key, state: next }));
  }, [key, orderId, uid]);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const phase = state.order ? getCustomerOrderTracking(state.order).phase : "pending";
  const waitKey = key && state.syncState !== "error" && (state.syncState === "syncing" || phase === "pending")
    ? `${key}:${state.syncState}:${phase}` : null;
  useEffect(() => {
    if (!waitKey) return;
    // UI-only, one-shot notice. This timer never reads Firestore.
    const timeout = window.setTimeout(() => setDelayedKey(waitKey), 45000);
    return () => window.clearTimeout(timeout);
  }, [waitKey]);

  return {
    ...state,
    syncState: state.syncState === "complete" || state.syncState === "error"
      ? state.syncState : offline ? "offline" as const : state.syncState,
    delayed: !!waitKey && waitKey === delayedKey,
  };
}
