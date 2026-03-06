"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { formatPrice } from "@/types";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

interface StripeCheckoutFormProps {
  amountCents: number;
  onSuccess: () => void;
  onError: (message: string) => void;
}

function StripeCheckoutForm({
  amountCents,
  onSuccess,
  onError,
}: StripeCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Return URL handled by redirect; we never trust client amount
        return_url: `${window.location.origin}/order-confirmation`,
      },
      redirect: "if_required",
    });

    if (error) {
      onError(error.message ?? "Une erreur est survenue lors du paiement.");
      setSubmitting(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="rounded-[18px] bg-[#252525] p-5">
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full rounded-[18px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] py-4 text-[16px] font-bold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0D0D0D] border-t-transparent" />
            Paiement en cours…
          </span>
        ) : (
          `Payer ${formatPrice(amountCents)} €`
        )}
      </button>
    </form>
  );
}

interface StripeCheckoutProps {
  clientSecret: string;
  amountCents: number;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export default function StripeCheckout({
  clientSecret,
  amountCents,
  onSuccess,
  onError,
}: StripeCheckoutProps) {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#D4A053",
            colorBackground: "#252525",
            colorText: "#F5F5F5",
            colorTextSecondary: "#A0A0A0",
            colorDanger: "#E74C3C",
            borderRadius: "12px",
            fontFamily: "Poppins, sans-serif",
          },
        },
      }}
    >
      <StripeCheckoutForm
        amountCents={amountCents}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}
