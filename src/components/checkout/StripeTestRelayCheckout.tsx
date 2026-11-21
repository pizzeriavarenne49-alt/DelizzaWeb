"use client";

import { useRef, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { getClientFunctions } from "@/config/firebase-client";
import { isLocalStripeTestEnabled } from "@/lib/demo-payment";
import { formatPrice } from "@/types";

const scenarios = [
  { id: "visa", label: "Carte acceptée" },
  { id: "decline", label: "Carte refusée" },
  { id: "3ds", label: "Carte avec 3-D Secure" },
] as const;

type Scenario = typeof scenarios[number]["id"];
type TestRequest = { appId: string; orderId: string; paymentIntentId: string; scenario: Scenario; returnUrl: string };
type TestResult = { status: string; redirectUrl?: string; message?: string };

interface Props {
  appId: string;
  orderId: string;
  paymentIntentId: string;
  amountCents: number;
  disabled: boolean;
  onSuccess: () => void;
  onError: (error: unknown) => void;
}

export default function StripeTestRelayCheckout({ appId, orderId, paymentIntentId, amountCents, disabled, onSuccess, onError }: Props) {
  const confirming = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  if (!isLocalStripeTestEnabled()) return null;

  async function confirm(scenario: Scenario) {
    if (confirming.current || disabled) return;
    confirming.current = true;
    setSubmitting(true);
    try {
      const callable = httpsCallable<TestRequest, TestResult>(getClientFunctions(), "confirmStripeTest");
      const returnUrl = new URL("/order-confirmation", window.location.origin);
      returnUrl.searchParams.set("orderId", orderId);
      const { data } = await callable({ appId, orderId, paymentIntentId, scenario, returnUrl: returnUrl.href });
      if (data.status === "succeeded") {
        onSuccess();
        return;
      }
      if (data.status === "requires_action" && data.redirectUrl) {
        const redirect = new URL(data.redirectUrl);
        if (redirect.protocol !== "https:" || !redirect.hostname.endsWith(".stripe.com")) {
          throw new Error("Redirection Stripe Test invalide.");
        }
        window.location.assign(redirect.href);
        return;
      }
      if (data.status === "requires_payment_method" && scenario === "decline") {
        throw Object.assign(new Error("Card declined in Stripe Test."), { code: "card_declined" });
      }
      throw new Error(data.message ?? "Le paiement Stripe Test a été refusé.");
    } catch (error) {
      confirming.current = false;
      setSubmitting(false);
      onError(error);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-[#D4A053]/30 bg-[#252525] p-4">
      <p className="font-semibold text-[#E8C078]">Recette locale Stripe Test · {formatPrice(amountCents)} €</p>
      <div className="flex flex-wrap gap-2">
        {scenarios.map(({ id, label }) => (
          <button key={id} type="button" onClick={() => confirm(id)} disabled={submitting || disabled}
            className="rounded-xl bg-[#E8C078] px-4 py-2 text-sm font-semibold text-[#15110C] disabled:opacity-50">
            {label}
          </button>
        ))}
      </div>
      {submitting && <p role="status" className="text-sm text-[#F5F5F5]">Vérification auprès de Stripe Test…</p>}
    </div>
  );
}
