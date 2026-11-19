"use client";

import { useState } from "react";
import { formatPrice } from "@/types";

interface Props {
  amountCents: number;
  onComplete: () => Promise<void>;
  disabled?: boolean;
}

/** The real checkout payment stage for the isolated emulator only. It has no
 * card fields and never loads Stripe.js; completion is server-authoritative. */
export default function DemoPaymentCheckout({ amountCents, onComplete, disabled = false }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (disabled || submitting) return;
    setSubmitting(true);
    setError(null);
    try { await onComplete(); }
    catch { setError("La simulation de paiement n’a pas pu être confirmée. Réessayez sans recréer la commande."); }
    finally { setSubmitting(false); }
  };
  return <section className="flex flex-col gap-4 rounded-[18px] border border-[#D4A053]/30 bg-[#252525] p-5" aria-label="Paiement de démonstration locale">
    <div><p className="text-[15px] font-semibold text-[#F5F5F5]">Paiement simulé localement</p><p className="mt-1 text-[13px] leading-relaxed text-[#A0A0A0]">Aucune carte, donnée bancaire ou connexion Stripe n’est utilisée. La confirmation passe par le backend émulé.</p></div>
    {error && <p className="rounded-[12px] bg-[#E74C3C]/10 px-3 py-2 text-[13px] text-[#F59B90]" role="alert">{error}</p>}
    <button type="button" onClick={() => void submit()} disabled={disabled || submitting} className="w-full rounded-[18px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] py-4 text-[16px] font-bold text-[#0D0D0D] disabled:cursor-not-allowed disabled:opacity-50">
      {submitting ? "Confirmation en cours…" : `Simuler le paiement · ${formatPrice(amountCents)} €`}
    </button>
  </section>;
}
