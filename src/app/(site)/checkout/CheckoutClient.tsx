"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { createOrder, createPaymentIntent } from "@/services/order-service";
import { getAvailableSlots } from "@/services/slot-service";
import { formatPrice, computeTtcCents, formatTaxRate } from "@/types";
import type { FulfillmentData, TimeSlotInfo } from "@/types/order";

// Dynamically import Stripe component to avoid SSR issues
const StripeCheckout = dynamic(
  () => import("@/components/checkout/StripeCheckout"),
  { ssr: false },
);

const WL_APP_ID = process.env.NEXT_PUBLIC_WL_APP_ID ?? "";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getTodayDate(): Date {
  return new Date();
}

function getTomorrowDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
}

type SlotDateKey = "today" | "tomorrow";

function findNextAvailableSlot(slots: TimeSlotInfo[]): TimeSlotInfo | undefined {
  return slots.find((slot) => slot.status !== "full");
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = ["Livraison", "Récapitulatif", "Paiement"];
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((label, idx) => {
        const step = (idx + 1) as 1 | 2 | 3;
        const active = step === current;
        const done = step < current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold transition-colors ${
                  active
                    ? "bg-gradient-to-br from-[#D4A053] to-[#E8C078] text-[#0D0D0D]"
                    : done
                      ? "bg-[#D4A053]/30 text-[#D4A053]"
                      : "bg-[#252525] text-[#6B6B6B]"
                }`}
              >
                {done ? (
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                  </svg>
                ) : (
                  step
                )}
              </div>
              <span
                className={`mt-1 text-[11px] ${active ? "text-[#D4A053] font-semibold" : "text-[#6B6B6B]"}`}
              >
                {label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`mb-4 h-[2px] w-8 rounded-full transition-colors ${done ? "bg-[#D4A053]/50" : "bg-[#252525]"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Fulfillment ──────────────────────────────────────────────────────

interface FulfillmentFormState {
  isAsap: boolean;
  scheduledTime: string;
  instructions: string;
}

interface Step1Props {
  state: FulfillmentFormState;
  onChange: (s: FulfillmentFormState) => void;
  onNext: () => void;
  isEmpty: boolean;
}

function Step1Fulfillment({ state, onChange, onNext, isEmpty }: Step1Props) {
  const [selectedDate, setSelectedDate] = useState<SlotDateKey>("today");
  const [slots, setSlots] = useState<TimeSlotInfo[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [nextAsapSlot, setNextAsapSlot] = useState<{ dateKey: SlotDateKey; slot: TimeSlotInfo } | null>(null);

  const getSlotsForDate = useCallback(async (dateKey: SlotDateKey): Promise<TimeSlotInfo[]> => {
    const date = dateKey === "today" ? getTodayDate() : getTomorrowDate();
    return getAvailableSlots({ appId: WL_APP_ID, date: toISODate(date) });
  }, []);

  const fetchSlots = useCallback(async (dateKey: SlotDateKey) => {
    setSlotsLoading(true);
    setSlotsError(null);
    try {
      const result = await getSlotsForDate(dateKey);
      setSlots(result);
    } catch (err) {
      console.error("[slot-service] getAvailableSlots unexpected response or error:", err);
      setSlotsError("Impossible de charger les créneaux. Veuillez réessayer.");
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [getSlotsForDate]);

  const fetchNextAsapSlot = useCallback(async () => {
    setSlotsLoading(true);
    setSlotsError(null);
    try {
      const todaySlots = await getSlotsForDate("today");
      setSlots(todaySlots);
      const todayNextSlot = findNextAvailableSlot(todaySlots);
      if (todayNextSlot) {
        setNextAsapSlot({ dateKey: "today", slot: todayNextSlot });
        return;
      }

      const tomorrowSlots = await getSlotsForDate("tomorrow");
      const tomorrowNextSlot = findNextAvailableSlot(tomorrowSlots);
      if (tomorrowNextSlot) {
        setNextAsapSlot({ dateKey: "tomorrow", slot: tomorrowNextSlot });
      } else {
        setNextAsapSlot(null);
      }
    } catch (err) {
      console.error("[slot-service] getAvailableSlots unexpected response or error:", err);
      setSlotsError("Impossible de charger les créneaux. Veuillez réessayer.");
      setSlots([]);
      setNextAsapSlot(null);
    } finally {
      setSlotsLoading(false);
    }
  }, [getSlotsForDate]);

  // Fetch slots for schedule mode and compute the next slot for ASAP mode
  useEffect(() => {
    if (state.isAsap) {
      fetchNextAsapSlot();
      return;
    }
    setNextAsapSlot(null);
    fetchSlots(selectedDate);
  }, [state.isAsap, selectedDate, fetchSlots, fetchNextAsapSlot]);

  const handleDateChange = (dateKey: SlotDateKey) => {
    setSelectedDate(dateKey);
    onChange({ ...state, scheduledTime: "" });
  };

  const isAsapBlocked = state.isAsap && (!nextAsapSlot || slotsLoading || !!slotsError);

  return (
    <div className="flex flex-col gap-5">
      {/* Fulfillment method */}
      <div className="rounded-[18px] bg-[#1A1A1A] p-5 flex flex-col gap-3">
        <h2 className="text-[16px] font-bold text-[#F5F5F5]">Mode de retrait</h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="h-5 w-5 rounded-full border-2 border-[#D4A053] flex items-center justify-center bg-transparent">
            <div className="h-2.5 w-2.5 rounded-full bg-[#D4A053]" />
          </div>
          <span className="text-[14px] text-[#F5F5F5]">Click &amp; Collect</span>
          <span className="ml-auto rounded-full bg-[#D4A053]/15 px-2 py-0.5 text-[11px] text-[#D4A053] font-medium">Disponible</span>
        </label>
        <p className="text-[12px] text-[#6B6B6B]">Récupérez votre commande au restaurant</p>
      </div>

      {/* ASAP / Schedule */}
      <div className="rounded-[18px] bg-[#1A1A1A] p-5 flex flex-col gap-4">
        <h2 className="text-[16px] font-bold text-[#F5F5F5]">Heure de retrait</h2>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onChange({ ...state, isAsap: true })}
            className={`flex-1 rounded-[14px] py-3 text-[14px] font-semibold transition-colors ${
              state.isAsap
                ? "bg-gradient-to-br from-[#D4A053] to-[#E8C078] text-[#0D0D0D]"
                : "bg-[#252525] text-[#A0A0A0] hover:text-[#F5F5F5]"
            }`}
          >
            Dès que possible
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...state, isAsap: false })}
            className={`flex-1 rounded-[14px] py-3 text-[14px] font-semibold transition-colors ${
              !state.isAsap
                ? "bg-gradient-to-br from-[#D4A053] to-[#E8C078] text-[#0D0D0D]"
                : "bg-[#252525] text-[#A0A0A0] hover:text-[#F5F5F5]"
            }`}
          >
            Choisir un créneau
          </button>
        </div>

        {state.isAsap && (
          <div className="rounded-[14px] bg-[#252525] border border-white/10 px-4 py-3">
            {slotsLoading ? (
              <p className="text-[13px] text-[#A0A0A0]">Recherche du prochain créneau disponible…</p>
            ) : slotsError ? (
              <p className="text-[13px] text-[#E74C3C]">{slotsError}</p>
            ) : nextAsapSlot ? (
              <p className="text-[13px] text-[#F5F5F5]">
                Prochain créneau :{" "}
                <span className="font-semibold text-[#D4A053]">
                  {nextAsapSlot.dateKey === "today" ? "Aujourd'hui" : "Demain"} à {nextAsapSlot.slot.start}
                </span>
              </p>
            ) : (
              <p className="text-[13px] text-[#E74C3C]">
                Aucun créneau disponible aujourd’hui ou demain. Veuillez choisir un autre horaire.
              </p>
            )}
          </div>
        )}

        {!state.isAsap && (
          <div className="flex flex-col gap-4">
            {/* Date toggle: Today / Tomorrow */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDateChange("today")}
                className={`flex-1 rounded-[12px] py-2 text-[13px] font-semibold transition-colors ${
                  selectedDate === "today"
                    ? "bg-[#D4A053]/20 text-[#D4A053] border border-[#D4A053]/40"
                    : "bg-[#252525] text-[#A0A0A0] border border-white/10 hover:text-[#F5F5F5]"
                }`}
              >
                Aujourd&apos;hui
              </button>
              <button
                type="button"
                onClick={() => handleDateChange("tomorrow")}
                className={`flex-1 rounded-[12px] py-2 text-[13px] font-semibold transition-colors ${
                  selectedDate === "tomorrow"
                    ? "bg-[#D4A053]/20 text-[#D4A053] border border-[#D4A053]/40"
                    : "bg-[#252525] text-[#A0A0A0] border border-white/10 hover:text-[#F5F5F5]"
                }`}
              >
                Demain
              </button>
            </div>

            {/* Slot grid */}
            {slotsLoading ? (
              <div className="flex items-center justify-center py-8">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#D4A053] border-t-transparent" />
                <span className="ml-3 text-[13px] text-[#A0A0A0]">Chargement des créneaux…</span>
              </div>
            ) : slotsError ? (
              <div className="rounded-[14px] bg-[#E74C3C]/10 border border-[#E74C3C]/30 px-4 py-3 flex items-center justify-between gap-3">
                <p className="text-[13px] text-[#E74C3C]">{slotsError}</p>
                <button
                  type="button"
                  onClick={() => fetchSlots(selectedDate)}
                  className="text-[12px] text-[#D4A053] underline whitespace-nowrap"
                >
                  Réessayer
                </button>
              </div>
            ) : slots.length === 0 ? (
              <p className="text-center text-[13px] text-[#6B6B6B] py-4">Aucun créneau disponible pour ce jour.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => {
                  const isFull = slot.status === "full";
                  const isLimited = slot.status === "limited";
                  const isSelected = state.scheduledTime === slot.start;
                  return (
                    <button
                      key={slot.start}
                      type="button"
                      disabled={isFull}
                      onClick={() => onChange({ ...state, scheduledTime: slot.start })}
                      className={`relative flex flex-col items-center rounded-[14px] px-2 py-3 text-[13px] font-semibold transition-colors ${
                        isFull
                          ? "bg-[#252525] text-[#6B6B6B] opacity-40 cursor-not-allowed"
                          : isSelected
                            ? "bg-gradient-to-br from-[#D4A053] to-[#E8C078] text-[#0D0D0D]"
                            : isLimited
                              ? "bg-[#252525] text-[#F5F5F5] border border-[#D4A053]"
                              : "bg-[#252525] text-[#F5F5F5] border border-white/10 hover:border-[#D4A053]/50"
                      }`}
                    >
                      <span>{slot.start}</span>
                      {isFull ? (
                        <span className="mt-0.5 text-[10px] font-normal">Complet</span>
                      ) : isLimited ? (
                        <span className={`mt-0.5 text-[10px] font-normal ${isSelected ? "text-[#0D0D0D]/70" : "text-[#D4A053]"}`}>
                          Peu de places
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="rounded-[18px] bg-[#1A1A1A] p-5 flex flex-col gap-3">
        <h2 className="text-[16px] font-bold text-[#F5F5F5]">
          Instructions{" "}
          <span className="text-[13px] font-normal text-[#6B6B6B]">(optionnel)</span>
        </h2>
        <textarea
          value={state.instructions}
          onChange={(e) => onChange({ ...state, instructions: e.target.value })}
          placeholder="Sans oignon, sauce à part…"
          rows={3}
          className="w-full resize-none rounded-[14px] bg-[#252525] px-4 py-3 text-[14px] text-[#F5F5F5] placeholder:text-[#6B6B6B] border border-white/10 focus:border-[#D4A053] focus:outline-none"
        />
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={isEmpty || (!state.isAsap && !state.scheduledTime) || isAsapBlocked}
        className="w-full rounded-[18px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] py-4 text-[16px] font-bold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continuer
      </button>
    </div>
  );
}

// ─── Step 2: Summary ──────────────────────────────────────────────────────────

interface Step2Props {
  userEmail: string | null | undefined;
  isAsap: boolean;
  scheduledTime: string;
  instructions: string;
  onBack: () => void;
  onNext: () => void;
  loading: boolean;
  error: string | null;
}

function Step2Summary({
  userEmail,
  isAsap,
  scheduledTime,
  instructions,
  onBack,
  onNext,
  loading,
  error,
}: Step2Props) {
  const {
    items,
    getSubtotalCents,
    getTotalCents,
    getTaxBreakdown,
  } = useCart();

  const subtotal = getSubtotalCents();
  const total = getTotalCents();
  const taxBreakdown = getTaxBreakdown();

  return (
    <div className="flex flex-col gap-5">
      {/* Order items */}
      <div className="rounded-[18px] bg-[#1A1A1A] p-5 flex flex-col gap-3">
        <h2 className="text-[16px] font-bold text-[#F5F5F5]">Votre commande</h2>
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.catalogItemId} className="flex justify-between items-center text-[14px]">
              <span className="text-[#F5F5F5]">
                <span className="font-semibold text-[#D4A053]">{item.quantity}×</span>{" "}
                {item.nameSnapshot}
              </span>
              <span className="text-[#A0A0A0] whitespace-nowrap">
                {formatPrice(computeTtcCents(item.totalCents, item.taxRateBps))}&nbsp;€
              </span>
            </li>
          ))}
        </ul>

        <div className="border-t border-white/5 pt-3 flex flex-col gap-1.5">
          <div className="flex justify-between text-[13px] text-[#A0A0A0]">
            <span>Sous-total HT</span>
            <span>{formatPrice(subtotal)}&nbsp;€</span>
          </div>
          {taxBreakdown.map((entry) => (
            <div key={entry.rateBps} className="flex justify-between text-[13px] text-[#A0A0A0]">
              <span>TVA ({formatTaxRate(entry.rateBps)}%)</span>
              <span>{formatPrice(entry.taxCents)}&nbsp;€</span>
            </div>
          ))}
          <div className="flex justify-between text-[16px] font-bold text-[#F5F5F5] mt-1">
            <span>Total TTC</span>
            <span className="text-[#D4A053]">{formatPrice(total)}&nbsp;€</span>
          </div>
        </div>
      </div>

      {/* Fulfillment recap */}
      <div className="rounded-[18px] bg-[#1A1A1A] p-5 flex flex-col gap-2">
        <h2 className="text-[16px] font-bold text-[#F5F5F5]">Retrait</h2>
        <div className="flex justify-between text-[14px]">
          <span className="text-[#A0A0A0]">Mode</span>
          <span className="text-[#F5F5F5]">Click &amp; Collect</span>
        </div>
        <div className="flex justify-between text-[14px]">
          <span className="text-[#A0A0A0]">Heure</span>
          <span className="text-[#F5F5F5]">{isAsap ? "Dès que possible" : scheduledTime}</span>
        </div>
        {instructions && (
          <div className="flex justify-between text-[14px]">
            <span className="text-[#A0A0A0]">Instructions</span>
            <span className="text-[#F5F5F5] text-right max-w-[60%]">{instructions}</span>
          </div>
        )}
      </div>

      {/* Account */}
      {userEmail && (
        <div className="rounded-[18px] bg-[#1A1A1A] p-5 flex flex-col gap-2">
          <h2 className="text-[16px] font-bold text-[#F5F5F5]">Compte</h2>
          <p className="text-[14px] text-[#A0A0A0]">{userEmail}</p>
        </div>
      )}

      {error && (
        <div className="rounded-[14px] bg-[#E74C3C]/10 border border-[#E74C3C]/30 px-4 py-3 text-[13px] text-[#E74C3C]">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-[18px] border border-white/10 py-4 text-[15px] font-semibold text-[#A0A0A0] hover:text-[#F5F5F5] hover:border-white/20 transition-colors"
        >
          Retour
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={loading}
          className="flex-[2] rounded-[18px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] py-4 text-[16px] font-bold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0D0D0D] border-t-transparent" />
              Préparation…
            </span>
          ) : (
            `Payer ${formatPrice(total)} €`
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main CheckoutClient ──────────────────────────────────────────────────────

export default function CheckoutClient() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, isEmpty, getSubtotalCents, getTaxCents, getTotalCents, clearCart } = useCart();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fulfillment, setFulfillment] = useState<FulfillmentFormState>({
    isAsap: true,
    scheduledTime: "",
    instructions: "",
  });

  // Payment state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentAmountCents, setPaymentAmountCents] = useState(0);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProceedToPayment = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const fulfillmentData: FulfillmentData = {
        method: "clickAndCollect",
        isAsap: fulfillment.isAsap,
        source: "web",
        paymentTiming: "before",
        ...((!fulfillment.isAsap && fulfillment.scheduledTime)
          ? { scheduledTime: fulfillment.scheduledTime }
          : {}),
        ...(fulfillment.instructions
          ? { instructions: fulfillment.instructions }
          : {}),
      };

      const orderResult = await createOrder({
        appId: WL_APP_ID,
        userId: user.uid,
        userEmail: user.email ?? "",
        items,
        subtotalCents: getSubtotalCents(),
        taxCents: getTaxCents(),
        totalCents: getTotalCents(),
        fulfillmentData,
        // Temporary placeholder — the real paymentIntentId is set server-side
        // by createPaymentIntent and updated via Stripe webhook on completion.
        paymentId: `temp_web_${Date.now()}`,
        paymentMethod: "card",
      });

      const intentResult = await createPaymentIntent({
        appId: WL_APP_ID,
        orderId: orderResult.orderId,
      });

      setOrderId(orderResult.orderId);
      setClientSecret(intentResult.clientSecret);
      setPaymentAmountCents(intentResult.amountCents);
      setStep(3);
    } catch (err: unknown) {
      const isResourceExhausted =
        (err instanceof Error && err.message.includes("resource-exhausted")) ||
        (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "functions/resource-exhausted");
      if (isResourceExhausted) {
        setError("Ce créneau est complet. Veuillez en choisir un autre.");
        setStep(1);
      } else {
        const message =
          err instanceof Error ? err.message : "Une erreur est survenue.";
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [user, fulfillment, items, getSubtotalCents, getTaxCents, getTotalCents]);

  const handlePaymentSuccess = useCallback(() => {
    clearCart();
    router.push(
      `/order-confirmation${orderId ? `?orderId=${orderId}` : ""}`,
    );
  }, [clearCart, router, orderId]);

  const handlePaymentError = useCallback((message: string) => {
    setError(message);
    setStep(2);
  }, []);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0D0D0D] px-4 py-8">
        <div className="mx-auto max-w-lg">
          {/* Header */}
          <div className="mb-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (step === 1) router.back();
                else if (step === 2) setStep(1);
                else { setStep(2); setClientSecret(null); }
              }}
              aria-label="Retour"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1A1A1A] text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <h1 className="text-[22px] font-bold text-[#F5F5F5]">Commander</h1>
          </div>

          <StepIndicator current={step} />

          {step === 1 && (
            <Step1Fulfillment
              state={fulfillment}
              onChange={setFulfillment}
              onNext={() => setStep(2)}
              isEmpty={isEmpty}
            />
          )}

          {step === 2 && (
            <Step2Summary
              userEmail={user?.email}
              isAsap={fulfillment.isAsap}
              scheduledTime={fulfillment.scheduledTime}
              instructions={fulfillment.instructions}
              onBack={() => setStep(1)}
              onNext={handleProceedToPayment}
              loading={loading}
              error={error}
            />
          )}

          {step === 3 && clientSecret && (
            <div className="flex flex-col gap-5">
              <div className="rounded-[18px] bg-[#1A1A1A] p-5 flex justify-between items-center">
                <span className="text-[14px] text-[#A0A0A0]">Total à payer</span>
                <span className="text-[20px] font-bold text-[#D4A053]">
                  {formatPrice(paymentAmountCents)}&nbsp;€
                </span>
              </div>

              {error && (
                <div className="rounded-[14px] bg-[#E74C3C]/10 border border-[#E74C3C]/30 px-4 py-3 text-[13px] text-[#E74C3C]">
                  {error}
                </div>
              )}

              <StripeCheckout
                clientSecret={clientSecret}
                amountCents={paymentAmountCents}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
