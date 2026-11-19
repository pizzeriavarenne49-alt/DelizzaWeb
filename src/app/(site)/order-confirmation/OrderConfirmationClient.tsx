"use client";

import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import OrderProgress from "@/components/orders/OrderProgress";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useCustomerOrderTracking } from "@/hooks/useCustomerOrderTracking";
import { getCustomerOrderPresentation, getCustomerOrderTracking } from "@/lib/customer-order-presentation";
import { clearCheckoutAttemptForOrder, getStoredCheckoutAttemptOrderId } from "@/services/checkout-attempt";
import { isValidTrackingOrderId } from "@/services/customer-order-tracking";
import { formatPrice } from "@/types";
import { getMarketingState, retryMarketingOrderLinks } from "@/marketing/marketing-client";
import { useMarketing } from "@/marketing/MarketingProvider";
import { META_PURCHASE_ARMED_EVENT, trackMetaPaidOrder } from "@/marketing/meta-pixel";

const CONFIRMATION_ORDER_KEY = "delizza_order_confirmation_v1";
const CONFIRMATION_ORDER_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function storedConfirmationOrderId(): string | null {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(CONFIRMATION_ORDER_KEY) ?? "null");
    const orderId = typeof saved?.orderId === "string" ? saved.orderId : null;
    if (!isValidTrackingOrderId(orderId) || typeof saved.savedAt !== "number") return null;
    const age = Date.now() - saved.savedAt;
    return age >= 0 && age <= CONFIRMATION_ORDER_MAX_AGE_MS ? orderId : null;
  } catch {
    return null;
  }
}

function rememberConfirmationOrderId(orderId: string): boolean {
  try {
    window.sessionStorage.setItem(CONFIRMATION_ORDER_KEY, JSON.stringify({ orderId, savedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

function subscribeToConfirmationStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function OrderConfirmationContent() {
  const queryOrderId = useSearchParams().get("orderId");
  const storedOrderId = useSyncExternalStore(subscribeToConfirmationStorage, storedConfirmationOrderId, () => null);
  const orderId = queryOrderId ?? storedOrderId;
  const { user, loading: authLoading } = useAuth();
  const { consent: marketingConsent, enabled: marketingEnabled } = useMarketing();
  const [metaPurchaseArmed, setMetaPurchaseArmed] = useState(0);
  const { clearCart } = useCart();
  // Reuses the original onSnapshot subscription, now shared by both entry points.
  const { order, serverOrder, syncState, error, delayed } = useCustomerOrderTracking(orderId, !authLoading ? user?.uid ?? null : null);
  const tracking = order ? getCustomerOrderTracking(order) : null;
  const validOrderId = isValidTrackingOrderId(orderId);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const derivedError = authLoading ? null : !user
    ? "Connectez-vous pour consulter votre commande."
    : !validOrderId ? "Lien de suivi invalide." : error;

  useEffect(() => {
    if (!isValidTrackingOrderId(queryOrderId) || !marketingEnabled || !marketingConsent?.metaAdvertising ||
        !rememberConfirmationOrderId(queryOrderId)) return;
    try { window.history.replaceState(window.history.state, "", window.location.pathname); } catch { /* Storage and URL cleanup are optional. */ }
  }, [queryOrderId, marketingEnabled, marketingConsent?.metaAdvertising]);

  useEffect(() => {
    const onArmed = () => setMetaPurchaseArmed(value => value + 1);
    window.addEventListener(META_PURCHASE_ARMED_EVENT, onArmed);
    return () => window.removeEventListener(META_PURCHASE_ARMED_EVENT, onArmed);
  }, []);

  useEffect(() => {
    if (user?.uid && validOrderId) void retryMarketingOrderLinks();
  }, [user?.uid, validOrderId, orderId]);

  useEffect(() => {
    if (order && serverOrder && marketingEnabled && marketingConsent?.metaAdvertising && getMarketingState().consent?.metaAdvertising) {
      trackMetaPaidOrder(order.appId, order.id, serverOrder);
    }
  }, [order, serverOrder, marketingEnabled, marketingConsent?.metaAdvertising, metaPurchaseArmed]);

  useEffect(() => {
    // Never clear a new basket when reopening an older order from the profile.
    // paymentStatus is interpreted by the existing validation contract, not the redirect URL.
    if (order && (syncState === "live" || syncState === "complete")
        && getCustomerOrderPresentation(order).state === "validated"
        && getStoredCheckoutAttemptOrderId() === order.id) {
      clearCheckoutAttemptForOrder(order.id);
      clearCart();
    }
  }, [clearCart, order, syncState]);

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-[70vh] bg-background px-4 pb-12 pt-7 sm:pt-10">
      <div className="mx-auto flex max-w-md flex-col gap-5">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">Deli’Zza · À emporter</p>
          <h1 ref={titleRef} tabIndex={-1} className="mt-2 text-[28px] font-bold tracking-tight text-foreground">Votre commande</h1>
          <p className="mt-1 text-sm text-text-secondary">Du four à votre table, suivez chaque étape.</p>
        </header>

        {!order && !derivedError && (
          <div className="rounded-[20px] border border-white/10 bg-surface px-5 py-6 text-sm leading-relaxed text-text-secondary" role="status">
            {authLoading ? "Restauration de votre session…"
              : syncState === "offline" ? "Vous êtes hors connexion. Le suivi reprendra automatiquement au retour du réseau."
                : delayed ? "La connexion prend plus de temps que prévu. Le suivi apparaîtra automatiquement dès sa synchronisation."
                  : "Connexion au suivi de votre commande…"}
          </div>
        )}

        {derivedError && (
          <div className="rounded-[20px] border border-red-400/25 bg-red-950/20 px-5 py-5 text-sm leading-relaxed text-red-200" role="alert">{derivedError}</div>
        )}

        {order && tracking && (
          <>
            <OrderProgress key={order.id} tracking={tracking} syncState={syncState} delayed={delayed} />
            <section className="rounded-[20px] border border-white/10 bg-surface px-5 py-5" aria-label="Détails de commande">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="min-w-0 break-words text-base font-semibold text-foreground">{order.orderNumber}</h2>
                <span className="shrink-0 text-base font-semibold text-gold">{formatPrice(order.totalCents)} €</span>
              </div>
              <dl className="flex flex-col gap-3 text-sm">
                <Row label="Commandée le" value={order.createdAt || "Date indisponible"} />
                {order.pickup && <Row label="Retrait prévu" value={order.pickup} />}
                <Row label="Mode" value="À emporter" />
              </dl>
              {order.itemLabels.length > 0 && (
                <div className="mt-4 border-t border-white/10 pt-3 text-sm text-text-secondary">
                  {order.itemLabels.map((label, index) => <p key={`${index}-${label}`}>{label}</p>)}
                </div>
              )}
            </section>
          </>
        )}

        <div className="flex flex-col gap-3">
          {!user && !authLoading && (
            <Link href="/auth" className="flex min-h-12 items-center justify-center rounded-2xl bg-gold px-4 text-sm font-semibold text-background focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">Se connecter</Link>
          )}
          {tracking?.terminal && (
            <Link href="/menu" className="flex min-h-12 items-center justify-center rounded-2xl bg-gold px-4 text-sm font-semibold text-background transition-colors hover:bg-gold-light focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">Découvrir la carte</Link>
          )}
          {user && (
            <Link href="/profile" className="flex min-h-12 items-center justify-center rounded-2xl border border-white/15 px-4 text-sm text-foreground transition-colors hover:border-gold/50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">Retour à mes commandes</Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4"><dt className="text-text-secondary">{label}</dt><dd className="text-right font-medium text-foreground">{value}</dd></div>;
}

export default function OrderConfirmationClient() {
  return <Suspense fallback={<div className="min-h-[50vh] bg-background p-8 text-center text-text-secondary" role="status">Chargement du suivi…</div>}><OrderConfirmationContent /></Suspense>;
}
