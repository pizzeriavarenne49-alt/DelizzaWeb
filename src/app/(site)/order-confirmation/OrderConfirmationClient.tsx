"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { getClientFirestore } from "@/config/firebase-client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import {
  getCustomerOrderPresentation,
  type CustomerOrderPresentation,
} from "@/lib/customer-order-presentation";
import { clearCheckoutAttemptForOrder } from "@/services/checkout-attempt";
import { DELIZZA_CUSTOMER_APP_ID } from "@/services/customer-session";
import { formatPrice } from "@/types";

const PENDING_PROLONGED_DELAY_MS = 45000;
const LEGACY_ORDER_REFERENCE_LABEL = "Référence indisponible";

interface OrderView {
  id: string;
  appId: string;
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
}

interface OrderLoadState {
  key: string;
  order: OrderView | null;
  error: string | null;
}

function dateFromFirestore(value: unknown): Date | null {
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

function formatDate(value: unknown): string {
  const date = dateFromFirestore(value);
  return date ? date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "";
}

function formatPickup(data: Record<string, unknown>): string {
  const fulfillment = data.fulfillmentData as Record<string, unknown> | undefined;
  const raw = fulfillment?.pickupAt ?? data.pickupAt;
  if (typeof raw === "string") {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString("fr-FR", {
        timeZone: "Europe/Paris",
        dateStyle: "short",
        timeStyle: "short",
      });
    }
  }
  if (typeof fulfillment?.scheduledTime === "string") return fulfillment.scheduledTime;
  return "";
}

function mapOrder(id: string, data: Record<string, unknown>): OrderView {
  return {
    id,
    appId: typeof data.appId === "string" ? data.appId : "",
    orderNumber: typeof data.orderNumber === "string" && data.orderNumber.trim()
      ? data.orderNumber
      : LEGACY_ORDER_REFERENCE_LABEL,
    createdAt: formatDate(data.createdAt),
    pickup: formatPickup(data),
    totalCents: typeof data.totalCents === "number" ? data.totalCents : 0,
    status: typeof data.status === "string" ? data.status : "unknown",
    paymentStatus: typeof data.paymentStatus === "string" ? data.paymentStatus : "unknown",
    fulfillmentStatus: typeof data.fulfillmentStatus === "string" ? data.fulfillmentStatus : "",
    productionAuthorized: data.productionAuthorized === true,
    paidTotalCents: typeof data.paidTotalCents === "number" ? data.paidTotalCents : 0,
    fulfillmentData:
      typeof data.fulfillmentData === "object" && data.fulfillmentData !== null
        ? (data.fulfillmentData as Record<string, unknown>)
        : null,
  };
}

function statusMessage(
  presentation: CustomerOrderPresentation,
  prolongedPending: boolean,
): { title: string; body: string; tone: "pending" | "paid" | "failed" } {
  if (presentation.state === "validated") {
    return {
      title: "Commande validée",
      body: "Le paiement est valide par le backend. Votre commande est transmise a l'equipe.",
      tone: "paid",
    };
  }
  if (presentation.state === "cancelled") {
    return {
      title: "Commande annulée",
      body: "Cette commande n'est pas active. Vous pouvez revenir au checkout pour passer une nouvelle commande.",
      tone: "failed",
    };
  }
  if (prolongedPending) {
    return {
      title: "Validation plus longue que prevu",
      body: "La confirmation Stripe prend plus de temps. Ne payez pas une deuxieme fois : gardez cette reference et rechargez la page dans quelques instants.",
      tone: "pending",
    };
  }
  return {
    title: "Validation du paiement en cours",
    body: "Nous attendons la confirmation Stripe et la reconciliation backend.",
    tone: "pending",
  };
}

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const { user, loading: authLoading } = useAuth();
  const { clearCart } = useCart();
  const [loadState, setLoadState] = useState<OrderLoadState | null>(null);
  const [prolongedPendingKey, setProlongedPendingKey] = useState<string | null>(null);
  const validOrderId = !!orderId && /^[A-Za-z0-9_-]{6,120}$/.test(orderId);
  const listenKey = user && validOrderId ? `${user.uid}:${orderId}` : null;
  const order = loadState?.key === listenKey ? loadState.order : null;
  const loadError = loadState?.key === listenKey ? loadState.error : null;
  const derivedError =
    authLoading
      ? null
      : !user
        ? "Connectez-vous pour consulter cette confirmation."
        : !validOrderId
          ? "Lien de confirmation invalide."
          : loadError;
  const loading = authLoading || (!!listenKey && loadState?.key !== listenKey);
  const orderPresentation = useMemo(
    () => order
      ? getCustomerOrderPresentation(order)
      : ({
          state: "hiddenTemporary",
          label: "Paiement en cours de validation",
        } as CustomerOrderPresentation),
    [order],
  );
  const pendingKey = order && orderPresentation.state === "hiddenTemporary"
    ? `${order.id}:${order.paymentStatus}:${order.status}`
    : null;
  const prolongedPending = !!pendingKey && prolongedPendingKey === pendingKey;

  useEffect(() => {
    if (!listenKey || !orderId) return;

    const db = getClientFirestore();
    const unsubscribe = onSnapshot(
      doc(db, "orders", orderId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setLoadState({
            key: listenKey,
            order: null,
            error: "Commande introuvable ou inaccessible avec ce compte.",
          });
        } else {
          const mapped = mapOrder(snapshot.id, snapshot.data());
          if (mapped.appId !== DELIZZA_CUSTOMER_APP_ID) {
            setLoadState({
              key: listenKey,
              order: null,
              error: "Commande introuvable ou inaccessible avec ce compte.",
            });
          } else {
            setLoadState({ key: listenKey, order: mapped, error: null });
          }
        }
      },
      (err) => {
        console.error("[confirmation] Unable to load order:", {
          code: typeof err === "object" && err !== null ? (err as { code?: unknown }).code : undefined,
        });
        setLoadState({
          key: listenKey,
          order: null,
          error: "Commande introuvable ou inaccessible avec ce compte.",
        });
      },
    );

    return unsubscribe;
  }, [listenKey, orderId]);

  useEffect(() => {
    if (!pendingKey) return;
    const timeout = window.setTimeout(() => setProlongedPendingKey(pendingKey), PENDING_PROLONGED_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [pendingKey]);

  useEffect(() => {
    if (order && orderPresentation.state === "validated") {
      clearCheckoutAttemptForOrder(order.id);
      clearCart();
    }
  }, [clearCart, order, orderPresentation.state]);

  const message = useMemo(
    () => statusMessage(orderPresentation, prolongedPending),
    [orderPresentation, prolongedPending],
  );

  return (
    <div className="min-h-screen bg-[#0D0D0D] px-4 py-12">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <div className="text-center">
          <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${
            message.tone === "paid"
              ? "bg-[#2ECC71]"
              : message.tone === "failed"
                ? "bg-[#E74C3C]"
                : "bg-gradient-to-br from-[#D4A053] to-[#E8C078]"
          }`}>
            <span className="text-[28px] font-bold text-[#0D0D0D]">
              {message.tone === "paid" ? "OK" : message.tone === "failed" ? "!" : "..."}
            </span>
          </div>
          <h1 className="mb-2 text-[26px] font-extrabold text-[#F5F5F5]">{message.title}</h1>
          <p className="text-[15px] leading-relaxed text-[#A0A0A0]">{message.body}</p>
        </div>

        {loading && (
          <div className="rounded-[18px] bg-[#1A1A1A] px-6 py-5 text-center text-[14px] text-[#A0A0A0]">
            {authLoading ? "Restauration de votre session..." : "Chargement de la commande..."}
          </div>
        )}

        {derivedError && !loading && (
          <div className="rounded-[18px] border border-[#E74C3C]/30 bg-[#E74C3C]/10 px-6 py-5 text-[14px] text-[#F59B90]">
            {derivedError}
          </div>
        )}

        {order && (
          <div className="rounded-[18px] bg-[#1A1A1A] px-6 py-5">
            <h2 className="mb-4 text-[16px] font-bold text-[#F5F5F5]">Details de commande</h2>
            <dl className="flex flex-col gap-3 text-[14px]">
              <Row label="Reference" value={order.orderNumber} />
              <Row label="Date" value={order.createdAt || "-"} />
              <Row label="Retrait" value={order.pickup || "-"} />
              <Row label="Total TTC" value={`${formatPrice(order.totalCents)} EUR`} />
              <Row
                label="Commande"
                value={
                  orderPresentation.state === "validated"
                    ? "Commande validée"
                    : orderPresentation.state === "cancelled"
                      ? "Commande annulée"
                      : "Paiement en cours de validation"
                }
              />
            </dl>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {!user && !authLoading && (
            <Link
              href="/auth"
              className="block rounded-[18px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] py-4 text-center text-[15px] font-bold text-[#0D0D0D]"
            >
              Se connecter
            </Link>
          )}
          {user && orderPresentation.state !== "validated" && (
            <Link
              href="/checkout"
              className="block rounded-[18px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] py-4 text-center text-[15px] font-bold text-[#0D0D0D]"
            >
              Retour au checkout
            </Link>
          )}
          {user && (
            <Link
              href="/profile"
              className="block rounded-[18px] border border-white/10 py-3.5 text-center text-[14px] text-[#A0A0A0] transition-colors hover:border-white/20 hover:text-[#F5F5F5]"
            >
              Voir mon profil
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[#A0A0A0]">{label}</dt>
      <dd className="text-right font-medium text-[#F5F5F5]">{value}</dd>
    </div>
  );
}

export default function OrderConfirmationClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0D0D0D]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4A053] border-t-transparent" />
        </div>
      }
    >
      <OrderConfirmationContent />
    </Suspense>
  );
}
