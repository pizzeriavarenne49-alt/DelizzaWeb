import { Suspense } from "react";
import Link from "next/link";
import { getServerFirestore } from "@/config/firebase-server";
import { doc, getDoc } from "firebase/firestore";
import type { OrderData } from "@/types/order";
import { formatPrice } from "@/types";

// ─── Server component to fetch order from Firestore ──────────────────────────

async function OrderConfirmationContent({ orderId }: { orderId: string }) {
  if (!orderId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <span className="text-[48px]" aria-hidden="true">
          ❓
        </span>
        <div>
          <h1 className="text-[22px] font-bold text-[#F5F5F5]">
            Commande introuvable
          </h1>
          <p className="mt-2 text-[13px] text-[#A0A0A0]">
            Aucun identifiant de commande fourni.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-[18px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] px-6 py-2.5 text-[15px] font-semibold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)] active:scale-95 transition-transform"
        >
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  let order: OrderData | null = null;
  let error: string | null = null;

  try {
    const db = getServerFirestore();
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      error = "Commande non trouvée";
    } else {
      order = {
        id: orderSnap.id,
        ...orderSnap.data(),
      } as OrderData;
    }
  } catch (err) {
    console.error("[order-confirmation] Error fetching order:", err);
    error = "Impossible de charger la commande. Veuillez réessayer.";
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <span className="text-[48px]" aria-hidden="true">
          ⚠️
        </span>
        <div>
          <h1 className="text-[22px] font-bold text-[#F5F5F5]">Erreur</h1>
          <p className="mt-2 text-[13px] text-[#A0A0A0]">{error}</p>
        </div>
        <Link
          href="/"
          className="rounded-[18px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] px-6 py-2.5 text-[15px] font-semibold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)] active:scale-95 transition-transform"
        >
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <span className="text-[48px]" aria-hidden="true">
          🔍
        </span>
        <div>
          <h1 className="text-[22px] font-bold text-[#F5F5F5]">
            Commande en cours de traitement
          </h1>
          <p className="mt-2 text-[13px] text-[#A0A0A0]">Veuillez patienter…</p>
        </div>
        <Link
          href="/"
          className="rounded-[18px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] px-6 py-2.5 text-[15px] font-semibold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)] active:scale-95 transition-transform"
        >
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  const statusIcon: Record<string, string> = {
    draft: "⏳",
    paid: "✅",
    cancelled: "❌",
    accepted: "👨‍🍳",
    inPreparation: "🍕",
    ready: "📦",
    completed: "🎉",
  };

  const statusLabel: Record<string, string> = {
    draft: "Paiement en attente",
    paid: "Paiement reçu",
    cancelled: "Commande annulée",
    accepted: "Commande acceptée",
    inPreparation: "Préparation en cours",
    ready: "Prête à retirer",
    completed: "Commande terminée",
  };

  const statusMessage: Record<string, string> = {
    draft:
      "Votre paiement est en cours de traitement. Vous recevrez une confirmation dans quelques minutes.",
    paid: "Votre paiement a été enregistré. La cuisine est avertie de votre commande.",
    cancelled:
      "Votre commande a été annulée. Aucun montant n'a été prélevé.",
    accepted: "Votre commande a été acceptée. La préparation commence.",
    inPreparation:
      "Votre pizza est en préparation. Elle sera bientôt prête !",
    ready: "Votre commande est prête à retirer. Venez vite !",
    completed: "Merci pour votre commande ! À bientôt chez Deli'Zza.",
  };

  return (
    <div className="flex min-h-screen flex-col gap-8 px-4 pt-8 pb-16">
      <div className="mx-auto max-w-lg w-full flex flex-col gap-8">
        {/* Hero */}
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="text-[64px]" aria-hidden="true">
            {statusIcon[order.status]}
          </span>
          <div>
            <h1 className="text-[28px] font-bold text-[#F5F5F5] leading-tight">
              {statusLabel[order.status] || "Commande"}
            </h1>
            <p className="mt-2 text-[14px] text-[#A0A0A0]">
              {statusMessage[order.status] || "Statut inconnu"}
            </p>
          </div>
        </div>

        {/* Order details */}
        <div className="rounded-[18px] bg-[#1A1A1A] p-5 flex flex-col gap-4">
          <div>
            <p className="text-[12px] text-[#6B6B6B] uppercase tracking-widest">
              N° de commande
            </p>
            <p className="text-[18px] font-bold text-[#F5F5F5]">
              {order.orderNumber}
            </p>
          </div>
          <div className="border-t border-white/5 pt-4">
            <p className="text-[12px] text-[#6B6B6B] uppercase tracking-widest mb-2">
              Articles
            </p>
            <ul className="flex flex-col gap-2">
              {order.items.map((item, idx) => (
                <li key={idx} className="flex justify-between text-[14px]">
                  <span className="text-[#F5F5F5]">
                    <span className="font-semibold text-[#D4A053]">
                      {item.quantity}×
                    </span>{" "}
                    {item.nameSnapshot}
                  </span>
                  <span className="text-[#A0A0A0]">
                    {formatPrice(item.totalCents)}&nbsp;€ HT
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-white/5 pt-4 flex justify-between text-[16px] font-bold">
            <span className="text-[#F5F5F5]">Total TTC</span>
            <span className="text-[#D4A053]">
              {formatPrice(order.totalCents)}&nbsp;€
            </span>
          </div>
        </div>

        {/* Fulfillment info */}
        <div className="rounded-[18px] bg-[#1A1A1A] p-5 flex flex-col gap-3">
          <p className="text-[12px] text-[#6B6B6B] uppercase tracking-widest">
            Retrait
          </p>
          <div className="flex justify-between text-[14px]">
            <span className="text-[#A0A0A0]">Mode</span>
            <span className="text-[#F5F5F5]">Click &amp; Collect</span>
          </div>
          {order.fulfillmentData.scheduledTime && (
            <div className="flex justify-between text-[14px]">
              <span className="text-[#A0A0A0]">Horaire</span>
              <span className="text-[#F5F5F5]">
                {order.fulfillmentData.scheduledTime}
              </span>
            </div>
          )}
          {order.fulfillmentData.instructions && (
            <div className="flex justify-between text-[14px]">
              <span className="text-[#A0A0A0]">Instructions</span>
              <span className="text-[#F5F5F5] text-right max-w-[60%]">
                {order.fulfillmentData.instructions}
              </span>
            </div>
          )}
        </div>

        {/* CTA */}
        <Link
          href="/"
          className="w-full rounded-[18px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] py-4 text-center text-[16px] font-bold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)] active:scale-95 transition-transform"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}

function OrderConfirmationLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#252525] border-t-[#D4A053]" />
      <p className="text-[15px] text-[#A0A0A0]">
        Chargement de votre commande…
      </p>
    </div>
  );
}

export default function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: { orderId?: string };
}) {
  const orderId = searchParams.orderId || "";

  return (
    <Suspense fallback={<OrderConfirmationLoading()>}>
      <OrderConfirmationContent orderId={orderId} />
    </Suspense>
  );
}

export const metadata = {
  title: "Confirmation de commande — Pizza Deli'Zza",
  description: "Suivi de votre commande Pizza Deli'Zza.",
  robots: { index: false },
};
