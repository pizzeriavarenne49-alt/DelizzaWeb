"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getClientFirestore } from "@/config/firebase-client";
import { DELIZZA_CUSTOMER_APP_ID } from "@/services/customer-session";

const LEGACY_ORDER_REFERENCE_LABEL = "Commande ancienne";

export interface CustomerProfile {
  displayName: string;
  phone: string;
}

export interface CustomerOrderSummary {
  id: string;
  orderNumber: string;
  createdAtLabel: string;
  pickupLabel: string;
  totalCents: number;
  status: string;
  paymentStatus: string;
  productionAuthorized: boolean;
  paidTotalCents: number;
  fulfillmentData: Record<string, unknown> | null;
}

function dateLabel(value: unknown): string {
  const date = value && typeof value === "object" && "toDate" in value
    ? (value as { toDate: () => Date }).toDate()
    : null;
  return date ? date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "";
}

function pickupLabel(data: Record<string, unknown>): string {
  const fulfillment = data.fulfillmentData as Record<string, unknown> | undefined;
  const pickupAt = fulfillment?.pickupAt ?? data.pickupAt;
  if (typeof pickupAt === "string") {
    const parsed = new Date(pickupAt);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString("fr-FR", {
        timeZone: "Europe/Paris",
        dateStyle: "short",
        timeStyle: "short",
      });
    }
  }
  if (typeof fulfillment?.scheduledTime === "string") return fulfillment.scheduledTime;
  return "";
}

export async function getCustomerProfile(uid: string): Promise<CustomerProfile> {
  const db = getClientFirestore();
  const snap = await getDoc(doc(db, "wl_apps", DELIZZA_CUSTOMER_APP_ID, "customers", uid));
  const data = snap.exists() ? snap.data() : {};
  return {
    displayName: typeof data.displayName === "string" ? data.displayName : "",
    phone: typeof data.phone === "string" ? data.phone : "",
  };
}

export async function updateCustomerProfile(uid: string, profile: CustomerProfile): Promise<void> {
  const db = getClientFirestore();
  await updateDoc(doc(db, "wl_apps", DELIZZA_CUSTOMER_APP_ID, "customers", uid), {
    displayName: profile.displayName.trim(),
    phone: profile.phone.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function listRecentCustomerOrders(uid: string): Promise<CustomerOrderSummary[]> {
  const db = getClientFirestore();
  const snap = await getDocs(query(
    collection(db, "orders"),
    where("appId", "==", DELIZZA_CUSTOMER_APP_ID),
    where("clientUserId", "==", uid),
    orderBy("createdAt", "desc"),
    limit(25),
  ));

  return snap.docs.map((orderDoc) => {
    const data = orderDoc.data();
    return {
      id: orderDoc.id,
      orderNumber: typeof data.orderNumber === "string" && data.orderNumber.trim()
        ? data.orderNumber
        : LEGACY_ORDER_REFERENCE_LABEL,
      createdAtLabel: dateLabel(data.createdAt),
      pickupLabel: pickupLabel(data),
      totalCents: typeof data.totalCents === "number" ? data.totalCents : 0,
      status: typeof data.status === "string" ? data.status : "unknown",
      paymentStatus: typeof data.paymentStatus === "string" ? data.paymentStatus : "unknown",
      productionAuthorized: data.productionAuthorized === true,
      paidTotalCents: typeof data.paidTotalCents === "number" ? data.paidTotalCents : 0,
      fulfillmentData:
        typeof data.fulfillmentData === "object" && data.fulfillmentData !== null
          ? (data.fulfillmentData as Record<string, unknown>)
          : null,
    };
  });
}
