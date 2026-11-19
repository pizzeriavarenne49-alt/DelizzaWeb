"use client";

import { doc, onSnapshot } from "firebase/firestore";
import { getClientFirestore } from "@/config/firebase-client";
import { getCustomerOrderTracking } from "@/lib/customer-order-presentation";
import { DELIZZA_CUSTOMER_APP_ID } from "@/services/customer-session";
import { customerOrderItemLabels } from "@/lib/customer-order-item-labels";

export interface TrackedCustomerOrder {
  id: string;
  appId: string;
  clientUserId: string;
  orderNumber: string;
  createdAt: string;
  pickup: string;
  totalCents: number;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  productionAuthorized: boolean;
  paidTotalCents: number;
  fulfillmentData: Record<string, unknown> | null;
  itemLabels: string[];
}

export interface CustomerOrderTrackingState {
  order: TrackedCustomerOrder | null;
  serverOrder?: Record<string, unknown>;
  syncState: "syncing" | "live" | "complete" | "error";
  error: string | null;
}

export function isValidTrackingOrderId(value: string | null): value is string {
  return !!value && /^[A-Za-z0-9_-]{6,120}$/.test(value);
}

function dateLabel(value: unknown): string {
  const date = typeof value === "string" ? new Date(value)
    : value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function"
      ? value.toDate() as Date : null;
  return date instanceof Date && Number.isFinite(date.getTime())
    ? date.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" }) : "";
}

function mapOrder(id: string, data: Record<string, unknown>): TrackedCustomerOrder {
  const fulfillment = data.fulfillmentData && typeof data.fulfillmentData === "object"
    ? data.fulfillmentData as Record<string, unknown> : null;
  return {
    id,
    appId: String(data.appId ?? ""),
    clientUserId: String(data.clientUserId ?? ""),
    orderNumber: typeof data.orderNumber === "string" && data.orderNumber.trim() ? data.orderNumber : "Référence indisponible",
    createdAt: dateLabel(data.createdAt),
    pickup: dateLabel(fulfillment?.pickupAt ?? data.pickupAt)
      || (typeof fulfillment?.scheduledTime === "string" ? fulfillment.scheduledTime : ""),
    totalCents: typeof data.totalCents === "number" ? data.totalCents : 0,
    status: typeof data.status === "string" ? data.status : "unknown",
    paymentStatus: typeof data.paymentStatus === "string" ? data.paymentStatus : "unknown",
    fulfillmentStatus: typeof data.fulfillmentStatus === "string" ? data.fulfillmentStatus : "",
    productionAuthorized: data.productionAuthorized === true,
    paidTotalCents: typeof data.paidTotalCents === "number" ? data.paidTotalCents : 0,
    fulfillmentData: fulfillment,
    itemLabels: customerOrderItemLabels(data),
  };
}

/** One document, no event-history query, polling, writes, or application-level retries. */
export function watchCustomerOrder(
  orderId: string,
  uid: string,
  onChange: (state: CustomerOrderTrackingState) => void,
): () => void {
  let active = true;
  let unsubscribe: (() => void) | undefined;
  const stop = () => {
    active = false;
    unsubscribe?.();
    unsubscribe = undefined;
  };
  const fail = (message = "Commande introuvable ou inaccessible avec ce compte.") => {
    if (!active) return;
    onChange({ order: null, syncState: "error", error: message });
    stop();
  };
  if (!uid || !isValidTrackingOrderId(orderId)) {
    fail();
    return stop;
  }
  try {
    unsubscribe = onSnapshot(
      doc(getClientFirestore(), "orders", orderId),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!active) return;
        if (!snapshot.exists()) {
          // An empty local cache is not proof that an order does not exist.
          if (snapshot.metadata.fromCache) {
            onChange({ order: null, syncState: "syncing", error: null });
          } else {
            fail();
          }
          return;
        }
        const data = snapshot.data();
        // Defense in depth; deployed Firestore rules remain the authorization boundary.
        if (data.appId !== DELIZZA_CUSTOMER_APP_ID || data.clientUserId !== uid) {
          fail();
          return;
        }
        const order = mapOrder(snapshot.id, data);
        const confirmed = !snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites;
        const complete = confirmed && getCustomerOrderTracking(order).terminal;
        onChange({
          order,
          serverOrder: confirmed ? data : undefined,
          syncState: complete ? "complete" : confirmed ? "live" : "syncing",
          error: null,
        });
        // 'ready' is NOT terminal: a kitchen modification can resume preparation.
        if (complete) stop();
      },
      () => fail("Le suivi est momentanément indisponible ou votre accès a changé. Revenez à votre profil pour rouvrir cette commande."),
    );
    // Also safe for synchronous adapters used in local tests.
    if (!active) stop();
  } catch {
    fail("Le suivi n’a pas pu démarrer. Revenez à votre profil pour rouvrir cette commande.");
  }
  return stop;
}
