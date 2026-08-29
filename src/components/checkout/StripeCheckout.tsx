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
  orderId: string;
  onSuccess: () => void;
  onError: (error: unknown) => void;
  disabled?: boolean;
  disabledMessage?: string | null;
}

function StripeCheckoutForm({
  amountCents,
  orderId,
  onSuccess,
  onError,
  disabled = false,
  disabledMessage = null,
}: StripeCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (submitting) return;
    if (disabled) {
      const error = new Error("ONLINE_ORDERING_EMERGENCY");
      Object.assign(error, {
        code: "ONLINE_ORDERING_EMERGENCY",
        details: { code: "ONLINE_ORDERING_EMERGENCY", message: disabledMessage },
      });
      onError(error);
      return;
    }

    setSubmitting(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Return URL handled by redirect; we never trust client amount
        return_url: `${window.location.origin}/order-confirmation?orderId=${encodeURIComponent(orderId)}`,
      },
      redirect: "if_required",
    });

    if (error) {
      onError(error);
      setSubmitting(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {disabled && disabledMessage && (
        <div className="rounded-[14px] border border-[#E74C3C]/30 bg-[#E74C3C]/10 px-4 py-3 text-[13px] leading-relaxed text-[#F5F5F5]">
          {disabledMessage}
        </div>
      )}

      <div className="rounded-[18px] bg-[#252525] p-5">
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>

      <button
        type="submit"
        disabled={!stripe || submitting || disabled}
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
  orderId: string;
  onSuccess: () => void;
  onError: (error: unknown) => void;
  disabled?: boolean;
  disabledMessage?: string | null;
}

export default function StripeCheckout({
  clientSecret,
  amountCents,
  orderId,
  onSuccess,
  onError,
  disabled = false,
  disabledMessage = null,
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
        orderId={orderId}
        onSuccess={onSuccess}
        onError={onError}
        disabled={disabled}
        disabledMessage={disabledMessage}
      />
    </Elements>
  );
}
