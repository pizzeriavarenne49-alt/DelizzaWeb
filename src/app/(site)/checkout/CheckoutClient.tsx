"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  doc,
  getDoc,
} from "firebase/firestore";
import Link from "next/link";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { getClientFirestore } from "@/config/firebase-client";
import {
  getServiceDateForKey,
  type SlotDateKey,
} from "@/lib/slot-contract";
import {
  buildScheduledFulfillmentDataFromPickupOption,
  isSameScheduledPickupOption,
  PICKUP_SLOT_UNAVAILABLE_MESSAGE,
  type ScheduledPickupOption,
} from "@/lib/production-capacity-preview";
import {
  ensureDelizzaCustomerSession,
  CustomerSessionSyncError,
} from "@/services/customer-session";
import {
  CLIENT_ERROR_MESSAGES,
  getClientErrorMessage,
} from "@/lib/client-error-message";
import { createOrder, createPaymentIntent } from "@/services/order-service";
import {
  buildCheckoutAttemptFingerprint,
  getOrCreateCheckoutAttempt,
  rememberCheckoutAttemptOrder,
} from "@/services/checkout-attempt";
import { getCustomerProfile, type CustomerProfile } from "@/services/customer-profile-service";
import { previewScheduledPickupOptions } from "@/services/production-capacity-service";
import { formatPrice, formatTaxRate } from "@/types";
import type { CartItem } from "@/types/cart";
import type { FulfillmentData } from "@/types/order";
import {
  getLoyaltyState,
  type LoyaltyConfig,
  type LoyaltyState,
} from "@/services/loyalty-service";
import { formatFrenchPhone } from "@/lib/phone";

// Dynamically import Stripe component to avoid SSR issues
const StripeCheckout = dynamic(
  () => import("@/components/checkout/StripeCheckout"),
  { ssr: false },
);

const WL_APP_ID = process.env.NEXT_PUBLIC_WL_APP_ID ?? process.env.WL_APP_ID ?? "d_lizza";
const TERMS_VERSION = "cgu-2026-07";
const PRIVACY_VERSION = "privacy-2026-07";
const MINIMUM_ORDER_CENTS = 900;

function minimumOrderMessage(payableTotalCents: number): string | null {
  const remainingCents = MINIMUM_ORDER_CENTS - payableTotalCents;
  if (remainingCents <= 0) return null;
  return `Ajoutez ${formatPrice(remainingCents)} € pour atteindre le minimum de commande de 9 €.`;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function findNextAvailableSlot(slots: ScheduledPickupOption[]): ScheduledPickupOption | undefined {
  return slots.find((slot) => slot.status !== "full");
}

interface RewardPreview {
  itemIndex: number;
  item: CartItem;
  discountTtcCents: number;
  totalAfterRewardCents: number;
  isFullyCovered: boolean;
}

function findRewardPreview(
  items: CartItem[],
  config: LoyaltyConfig | undefined,
  totalCents: number,
): RewardPreview | null {
  if (!config) return null;

  const eligibleCategoryIds = new Set([
    config.pizzaCategoryId,
    ...config.eligiblePizzaCategoryIds,
  ]);

  let best: RewardPreview | null = null;
  items.forEach((item, index) => {
    if (!item.categoryId || !eligibleCategoryIds.has(item.categoryId) || item.quantity <= 0) {
      return;
    }

    const discountTtcCents = item.unitPriceCents;
    const totalAfterRewardCents = totalCents - discountTtcCents;
    const candidate: RewardPreview = {
      itemIndex: index,
      item,
      discountTtcCents,
      totalAfterRewardCents,
      isFullyCovered: totalAfterRewardCents <= 0,
    };

    if (!best || candidate.discountTtcCents < best.discountTtcCents) {
      best = candidate;
    }
  });

  return best;
}

type CartValidationResult =
  | { ok: true }
  | { ok: false; message: string; reason: string; details?: CartProductDiagnostic };

type CartProductDiagnostic = {
  productId: string;
  name: string;
  appId: string;
  categoryId: string;
  isActive: boolean;
  visible: boolean | null;
  published: boolean | null;
  archived: boolean | null;
  deleted: boolean | null;
  stock: number | null;
  stockManaged: boolean;
  manualOutOfStock: boolean;
  priceCents: number;
};

function boolOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function logCartValidationFailure(
  reason: string,
  details: CartProductDiagnostic | { productId: string; expectedAppId: string } | undefined,
  items: CartItem[],
): void {
  if (process.env.NODE_ENV === "production") {
    console.error("[checkout] Cart validation refused:", {
      reason,
      itemCount: items.length,
    });
    return;
  }

  console.error("[checkout] Cart validation refused:", {
    reason,
    details,
    cartItems: items.map((item) => ({
      productId: item.catalogItemId,
      name: item.nameSnapshot,
      categoryId: item.categoryId ?? null,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      totalCents: item.totalCents,
      taxRateBps: item.taxRateBps,
    })),
  });
}

async function validateCartProductsAvailable(items: CartItem[]): Promise<CartValidationResult> {
  const productIds = [...new Set(items.map((item) => item.catalogItemId))];
  if (productIds.length === 0) return { ok: true };

  const db = getClientFirestore();
  const products = new Map<
    string,
    {
      isActive: boolean;
      manualOutOfStock: boolean;
      visible: boolean | null;
      published: boolean | null;
      archived: boolean | null;
      deleted: boolean | null;
      stock: number | null;
      stockManaged: boolean;
      appId: string;
      name: string;
      categoryId: string;
      priceCents: number;
    }
  >();

  await Promise.all(
    productIds.map(async (productId) => {
      const snap = await getDoc(doc(db, "wl_catalog_items", productId));
      if (!snap.exists()) return;

      const data = snap.data();
      if (data.appId !== WL_APP_ID) return;

      const priceCents =
        typeof data.price?.amountCents === "number"
          ? data.price.amountCents
          : typeof data.priceCents === "number"
            ? data.priceCents
            : 0;

      products.set(snap.id, {
        appId: typeof data.appId === "string" ? data.appId : "",
        name: typeof data.name === "string" ? data.name : "",
        isActive: typeof data.isActive === "boolean" ? data.isActive : true,
        manualOutOfStock:
          typeof data.manualOutOfStock === "boolean"
            ? data.manualOutOfStock
            : false,
        visible: boolOrNull(data.visible),
        published: boolOrNull(data.published),
        archived: boolOrNull(data.archived),
        deleted: boolOrNull(data.deleted),
        stock: numberOrNull(data.stock),
        stockManaged:
          typeof data.stockManaged === "boolean" ? data.stockManaged : false,
        categoryId: typeof data.categoryId === "string" ? data.categoryId : "",
        priceCents,
      });
    }),
  );

  for (const productId of productIds) {
    const product = products.get(productId);
    if (!product) {
      const details = { productId, expectedAppId: WL_APP_ID };
      logCartValidationFailure("product_not_found_or_wrong_app", details, items);
      return {
        ok: false,
        message: "Un produit de votre panier est introuvable.",
        reason: "product_not_found_or_wrong_app",
      };
    }
    const details: CartProductDiagnostic = { productId, ...product };
    if (
      product.isActive !== true ||
      product.visible === false ||
      product.published === false ||
      product.archived === true ||
      product.deleted === true
    ) {
      logCartValidationFailure("product_unavailable", details, items);
      return {
        ok: false,
        message: `${product.name || "Ce produit"} n'est plus disponible.`,
        reason: "product_unavailable",
        details,
      };
    }
    if (product.manualOutOfStock === true) {
      logCartValidationFailure("manual_out_of_stock", details, items);
      return {
        ok: false,
        message: `${product.name || "Ce produit"} est en rupture.`,
        reason: "manual_out_of_stock",
        details,
      };
    }
    if (product.stockManaged === true && product.stock !== null && product.stock <= 0) {
      logCartValidationFailure("stock_managed_out_of_stock", details, items);
      return {
        ok: false,
        message: `${product.name || "Ce produit"} est en rupture.`,
        reason: "stock_managed_out_of_stock",
        details,
      };
    }
    if (!product.categoryId) {
      logCartValidationFailure("missing_category_id", details, items);
      return {
        ok: false,
        message: `${product.name || "Un produit"} ne peut pas être commandé : catégorie manquante.`,
        reason: "missing_category_id",
        details,
      };
    }
    if (product.priceCents <= 0) {
      logCartValidationFailure("invalid_price_cents", details, items);
      return {
        ok: false,
        message: `${product.name || "Un produit"} ne peut pas être commandé : prix invalide.`,
        reason: "invalid_price_cents",
        details,
      };
    }
  }

  return { ok: true };
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = ["Retrait", "Récapitulatif", "Paiement"];
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
  onSlotChange: (selection: { dateKey: SlotDateKey; slot: ScheduledPickupOption | null }) => void;
}

function Step1Fulfillment({ state, onChange, onNext, isEmpty, onSlotChange }: Step1Props) {
  const { items } = useCart();
  const [selectedDate, setSelectedDate] = useState<SlotDateKey>("today");
  const [selectedSlot, setSelectedSlot] = useState<ScheduledPickupOption | null>(null);
  const [slots, setSlots] = useState<ScheduledPickupOption[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [nextAsapSlot, setNextAsapSlot] = useState<{ dateKey: SlotDateKey; slot: ScheduledPickupOption } | null>(null);
  const previewRequestIdRef = useRef(0);

  const getSlotsForDate = useCallback(async (dateKey: SlotDateKey): Promise<ScheduledPickupOption[]> => {
    if (items.length === 0) return [];
    return previewScheduledPickupOptions({
      appId: WL_APP_ID,
      date: getServiceDateForKey(dateKey),
      items,
    });
  }, [items]);

  const fetchSlots = useCallback(async (dateKey: SlotDateKey) => {
    const requestId = previewRequestIdRef.current + 1;
    previewRequestIdRef.current = requestId;
    setSlotsLoading(true);
    setSlotsError(null);
    try {
      const result = await getSlotsForDate(dateKey);
      if (previewRequestIdRef.current !== requestId) return;
      setSlots(result);
      if (selectedSlot) {
        const liveSelection = result.find((slot) => isSameScheduledPickupOption(slot, selectedSlot));
        if (!liveSelection) {
          setSelectedSlot(null);
          onSlotChange({ dateKey, slot: null });
          onChange({ ...state, scheduledTime: "" });
          setSlotsError(PICKUP_SLOT_UNAVAILABLE_MESSAGE);
        }
      }
    } catch (err) {
      if (previewRequestIdRef.current !== requestId) return;
      console.error("[production-capacity-service] previewContinuousPickupWindows unexpected response or error:", err);
      setSlotsError(getClientErrorMessage(err, "slots"));
      setSlots([]);
    } finally {
      if (previewRequestIdRef.current === requestId) {
        setSlotsLoading(false);
      }
    }
  }, [getSlotsForDate, onChange, onSlotChange, selectedSlot, state]);

  const fetchNextAsapSlot = useCallback(async () => {
    const requestId = previewRequestIdRef.current + 1;
    previewRequestIdRef.current = requestId;
    setSlotsLoading(true);
    setSlotsError(null);
    try {
      const todaySlots = await getSlotsForDate("today");
      if (previewRequestIdRef.current !== requestId) return;
      setSlots(todaySlots);
      const todayNextSlot = findNextAvailableSlot(todaySlots);
      if (todayNextSlot) {
        setNextAsapSlot({ dateKey: "today", slot: todayNextSlot });
        return;
      }

      const tomorrowSlots = await getSlotsForDate("tomorrow");
      if (previewRequestIdRef.current !== requestId) return;
      const tomorrowNextSlot = findNextAvailableSlot(tomorrowSlots);
      if (tomorrowNextSlot) {
        setNextAsapSlot({ dateKey: "tomorrow", slot: tomorrowNextSlot });
      } else {
        setNextAsapSlot(null);
      }
    } catch (err) {
      if (previewRequestIdRef.current !== requestId) return;
      console.error("[production-capacity-service] previewContinuousPickupWindows unexpected response or error:", err);
      setSlotsError(getClientErrorMessage(err, "slots"));
      setSlots([]);
      setNextAsapSlot(null);
    } finally {
      if (previewRequestIdRef.current === requestId) {
        setSlotsLoading(false);
      }
    }
  }, [getSlotsForDate]);

  // Fetch slots for schedule mode and compute the next slot for ASAP mode
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (state.isAsap) {
        fetchNextAsapSlot();
        return;
      }
      setNextAsapSlot(null);
      fetchSlots(selectedDate);
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      previewRequestIdRef.current += 1;
    };
  }, [state.isAsap, selectedDate, fetchSlots, fetchNextAsapSlot]);

  const handleDateChange = (dateKey: SlotDateKey) => {
    setSelectedDate(dateKey);
    setSelectedSlot(null);
    onSlotChange({ dateKey, slot: null });
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
            onClick={() => onChange({ ...state, isAsap: false })}
            className={`hidden flex-1 rounded-[14px] py-3 text-[14px] font-semibold transition-colors ${
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
                  {nextAsapSlot.dateKey === "today" ? "Aujourd'hui" : "Demain"} à {nextAsapSlot.slot.end}
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
                  const isSelected = selectedSlot ? isSameScheduledPickupOption(slot, selectedSlot) : false;
                  return (
                    <button
                      key={`${slot.serviceOpeningId}_${slot.pickupAt}_${slot.slotId}`}
                      type="button"
                      disabled={isFull}
                      onClick={() => {
                        setSelectedSlot(slot);
                        onSlotChange({ dateKey: selectedDate, slot });
                        onChange({ ...state, scheduledTime: slot.end });
                      }}
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
                      <span>{slot.end}</span>
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
        disabled={isEmpty || (!state.isAsap && !selectedSlot) || isAsapBlocked}
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
  pickupLabel: string;
  instructions: string;
  rewardsAvailable: number;
  rewardPreview: RewardPreview | null;
  useReward: boolean;
  onUseRewardChange: (enabled: boolean) => void;
  onBack: () => void;
  onNext: () => void;
  loading: boolean;
  error: string | null;
  customerProfile: CustomerProfile | null;
  termsAccepted: boolean;
  onTermsAcceptedChange: (accepted: boolean) => void;
}

function Step2Summary({
  userEmail,
  isAsap,
  scheduledTime,
  pickupLabel,
  instructions,
  rewardsAvailable,
  rewardPreview,
  useReward,
  onUseRewardChange,
  onBack,
  onNext,
  loading,
  error,
  customerProfile,
  termsAccepted,
  onTermsAcceptedChange,
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
  const canUseReward = rewardsAvailable > 0 && rewardPreview !== null;
  const payableTotalCents =
    useReward && rewardPreview
      ? Math.max(0, rewardPreview.totalAfterRewardCents)
      : total;
  const minimumMessage = minimumOrderMessage(payableTotalCents);

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
                {formatPrice(item.totalCents)}&nbsp;€
              </span>
            </li>
          ))}
        </ul>

        <div className="border-t border-white/5 pt-3 flex flex-col gap-1.5">
          <div className="flex justify-between text-[13px] text-[#A0A0A0]">
            <span>Sous-total TTC</span>
            <span>{formatPrice(subtotal)}&nbsp;€</span>
          </div>
          {taxBreakdown.map((entry) => (
            <div key={entry.rateBps} className="flex justify-between text-[13px] text-[#A0A0A0]">
              <span>dont TVA ({formatTaxRate(entry.rateBps)}%)</span>
              <span>{formatPrice(entry.taxCents)}&nbsp;€</span>
            </div>
          ))}
          <div className="flex justify-between text-[16px] font-bold text-[#F5F5F5] mt-1">
            <span>Total TTC</span>
            <span className="text-[#D4A053]">{formatPrice(total)}&nbsp;€</span>
          </div>
        </div>
      </div>

      {rewardsAvailable > 0 && rewardPreview && (
        <div className="rounded-[18px] bg-[#1A1A1A] p-5 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <input
              id="use-loyalty-reward"
              type="checkbox"
              checked={useReward && canUseReward}
              disabled={!canUseReward}
              onChange={(event) => onUseRewardChange(event.target.checked)}
              className="mt-1 h-4 w-4 accent-[#D4A053]"
            />
            <label htmlFor="use-loyalty-reward" className="flex flex-1 flex-col gap-1">
              <span className="text-[15px] font-semibold text-[#F5F5F5]">
                Utiliser ma pizza offerte
              </span>
              <span className="text-[13px] text-[#A0A0A0]">
                Pizza estimée offerte : {rewardPreview.item.nameSnapshot}
              </span>
            </label>
          </div>

          <div className="rounded-[14px] bg-[#252525] px-4 py-3 flex flex-col gap-1.5">
            <div className="flex justify-between text-[13px] text-[#A0A0A0]">
              <span>Remise estimée fidélité</span>
              <span>-{formatPrice(rewardPreview.discountTtcCents)}&nbsp;€</span>
            </div>
            <div className="flex justify-between text-[14px] font-semibold text-[#F5F5F5]">
              <span>Total estimé après avantage</span>
              <span>{formatPrice(Math.max(0, rewardPreview.totalAfterRewardCents))}&nbsp;€</span>
            </div>
            <p className="text-[12px] text-[#6B6B6B]">
              Le serveur appliquera la récompense et recalculera la pizza offerte.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-[18px] bg-[#1A1A1A] p-5">
        <div className="flex justify-between text-[14px] font-semibold text-[#F5F5F5]">
          <span>Commande minimum</span>
          <span>9&nbsp;€</span>
        </div>
        {minimumMessage && (
          <p className="mt-2 text-[13px] leading-relaxed text-[#E74C3C]">
            {minimumMessage}
          </p>
        )}
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
          <span className="text-[#F5F5F5]">{isAsap ? "Dès que possible" : pickupLabel || scheduledTime}</span>
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
          {customerProfile?.displayName && (
            <p className="text-[14px] text-[#A0A0A0]">{customerProfile.displayName}</p>
          )}
          {customerProfile?.phone && (
            <p className="text-[14px] text-[#A0A0A0]">{formatFrenchPhone(customerProfile.phone)}</p>
          )}
        </div>
      )}

      <div className="rounded-[18px] bg-[#1A1A1A] p-5">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(event) => onTermsAcceptedChange(event.target.checked)}
            className="mt-1 h-4 w-4 accent-[#D4A053]"
          />
          <span className="text-[13px] leading-relaxed text-[#A0A0A0]">
            J&apos;accepte les{" "}
            <Link href="/cgu" className="text-[#D4A053] underline">conditions de commande</Link>
            {" "}et j&apos;ai accès à la{" "}
            <Link href="/privacy" className="text-[#D4A053] underline">politique de confidentialité</Link>.
          </span>
        </label>
      </div>

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
          disabled={loading || !termsAccepted || minimumMessage !== null}
          className="flex-[2] rounded-[18px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] py-4 text-[16px] font-bold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0D0D0D] border-t-transparent" />
              Préparation…
            </span>
          ) : (
            useReward && rewardPreview?.isFullyCovered
              ? "Valider ma commande"
              : `Payer ${formatPrice(payableTotalCents)} €`
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
  const { items, isEmpty, getSubtotalCents, getTaxCents, getTotalCents } = useCart();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fulfillment, setFulfillment] = useState<FulfillmentFormState>({
    isAsap: false,
    scheduledTime: "",
    instructions: "",
  });
  const [selectedSlotSelection, setSelectedSlotSelection] = useState<{
    dateKey: SlotDateKey;
    slot: ScheduledPickupOption | null;
  } | null>(null);

  // Payment state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentAmountCents, setPaymentAmountCents] = useState(0);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loyalty, setLoyalty] = useState<LoyaltyState | null>(null);
  const [useReward, setUseReward] = useState(false);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    let cancelled = false;
    setProfileLoading(true);
    getLoyaltyState(WL_APP_ID, user.uid)
      .then((state) => {
        if (!cancelled) setLoyalty(state);
      })
      .catch((err) => {
        console.error("[loyalty-service] Unable to load loyalty checkout data:", err);
        if (!cancelled) {
          setLoyalty(null);
          setUseReward(false);
        }
      });

    getCustomerProfile(user.uid)
      .then((loadedProfile) => {
        if (!cancelled) setProfile(loadedProfile);
      })
      .catch((err) => {
        console.error("[customer-profile] Unable to load checkout profile:", {
          code: typeof err === "object" && err !== null ? (err as { code?: unknown }).code : undefined,
        });
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const rewardPreview = useMemo(
    () => findRewardPreview(items, loyalty?.config, getTotalCents()),
    [items, loyalty?.config, getTotalCents],
  );
  const rewardsAvailable = loyalty?.account.rewardsAvailable ?? 0;
  const canUseReward =
    rewardsAvailable > 0 && rewardPreview !== null;
  const isFullyCoveredReward =
    useReward && rewardPreview?.isFullyCovered === true;
  const pickupLabel = selectedSlotSelection
    ? `${selectedSlotSelection.dateKey === "today" ? "Aujourd'hui" : "Demain"} • ${selectedSlotSelection.slot ? selectedSlotSelection.slot.end : fulfillment.scheduledTime}`
    : fulfillment.scheduledTime;

  useEffect(() => {
    if (!canUseReward && useReward) {
      setUseReward(false);
    }
  }, [canUseReward, useReward]);

  const handleProceedToPayment = useCallback(async () => {
    if (!user) return;
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      if (!termsAccepted) {
        setError("Vous devez accepter les conditions de commande avant de payer.");
        return;
      }
      if (profileLoading) {
        setError("Votre profil client est encore en cours de synchronisation.");
        return;
      }
      if (!profile?.displayName?.trim() || !profile?.phone?.trim()) {
        setError("Completez votre nom et votre telephone dans votre profil avant de commander.");
        return;
      }
      const payableTotalCents =
        useReward && rewardPreview
          ? Math.max(0, rewardPreview.totalAfterRewardCents)
          : getTotalCents();
      const checkoutMinimumMessage = minimumOrderMessage(payableTotalCents);
      if (checkoutMinimumMessage) {
        setError(checkoutMinimumMessage);
        return;
      }
      const cartValidation = await validateCartProductsAvailable(items);
      if (!cartValidation.ok) {
        console.error("[checkout] Refusing before createOrder:", cartValidation);
        setError(cartValidation.message);
        return;
      }

      await ensureDelizzaCustomerSession(true);

      let fulfillmentData: FulfillmentData;
      if (fulfillment.isAsap) {
        setError("Choisissez un créneau de retrait disponible.");
        setStep(1);
        return;
      } else {
        if (!selectedSlotSelection?.slot) {
          setError(PICKUP_SLOT_UNAVAILABLE_MESSAGE);
          setStep(1);
          return;
        }

        const selectedSlot = selectedSlotSelection.slot;
        if (!selectedSlot) {
          setSelectedSlotSelection(null);
          setError(PICKUP_SLOT_UNAVAILABLE_MESSAGE);
          setStep(1);
          return;
        }

        const serviceDate = getServiceDateForKey(selectedSlotSelection.dateKey);
        const liveSlots = await previewScheduledPickupOptions({
          appId: WL_APP_ID,
          date: serviceDate,
          items,
        });
        const liveSlot = liveSlots.find((slot) => isSameScheduledPickupOption(slot, selectedSlot));
        if (!liveSlot) {
          setSelectedSlotSelection(null);
          setError(PICKUP_SLOT_UNAVAILABLE_MESSAGE);
          setStep(1);
          return;
        }

        fulfillmentData = buildScheduledFulfillmentDataFromPickupOption({
          slot: liveSlot,
          instructions: fulfillment.instructions || undefined,
        });
      }

      const rewardItemIndex =
        useReward &&
        rewardPreview &&
        Number.isInteger(rewardPreview.itemIndex) &&
        rewardPreview.itemIndex >= 0
          ? rewardPreview.itemIndex
          : undefined;
      const customerName = profile?.displayName?.trim() || user.displayName || "";
      const customerPhone = profile?.phone?.trim() || "";
      const fingerprint = buildCheckoutAttemptFingerprint({
        appId: WL_APP_ID,
        userId: user.uid,
        items,
        fulfillmentData,
        customerName,
        customerPhone,
        useReward,
        ...(rewardItemIndex !== undefined ? { rewardItemIndex } : {}),
      });
      const attempt = getOrCreateCheckoutAttempt(fingerprint);

      const orderResult = await createOrder({
        appId: WL_APP_ID,
        userId: user.uid,
        userEmail: user.email ?? "",
        items,
        subtotalCents: getSubtotalCents(),
        taxCents: getTaxCents(),
        totalCents: payableTotalCents,
        fulfillmentData,
        // Temporary placeholder — the real paymentIntentId is set server-side
        // by createPaymentIntent and updated via Stripe webhook on completion.
        paymentId: `web_pending_${attempt.idempotencyKey}`,
        paymentMethod: "card",
        source: "web",
        idempotencyKey: attempt.idempotencyKey,
        customerName,
        customerPhone,
        legalAcceptance: {
          termsVersion: TERMS_VERSION,
          privacyVersion: PRIVACY_VERSION,
          acceptedAt: new Date().toISOString(),
          origin: "web",
          uid: user.uid,
        },
        ...(rewardItemIndex !== undefined ? { rewardItemIndex } : {}),
      });
      rememberCheckoutAttemptOrder(fingerprint, orderResult.orderId);

      if (isFullyCoveredReward) {
        router.push(
          `/order-confirmation?orderId=${orderResult.orderId}&payment=loyalty_reward`,
        );
        return;
      }

      const intentResult = await createPaymentIntent({
        appId: WL_APP_ID,
        orderId: orderResult.orderId,
      });

      setOrderId(orderResult.orderId);
      setClientSecret(intentResult.clientSecret);
      setPaymentAmountCents(intentResult.amountCents);
      setStep(3);
    } catch (err: unknown) {
      console.error("[checkout] Unable to create order or payment intent:", err);
      if (err instanceof CustomerSessionSyncError) {
        setError(err.message);
        return;
      }
      if (process.env.NODE_ENV !== "production") {
        console.error("[checkout] createOrder/createPaymentIntent context:", {
          appId: WL_APP_ID,
          fulfillment,
          itemCount: items.length,
        });
      }
      const message = getClientErrorMessage(err, "checkout");
      if (message === CLIENT_ERROR_MESSAGES.slotUnavailable) {
        setError(message);
        setStep(1);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }, [
    user,
    fulfillment,
    selectedSlotSelection,
    items,
    getSubtotalCents,
    getTaxCents,
    getTotalCents,
    router,
    useReward,
    isFullyCoveredReward,
    rewardPreview,
    termsAccepted,
    profile,
    profileLoading,
  ]);

  const handlePaymentSuccess = useCallback(() => {
    router.push(
      `/order-confirmation${orderId ? `?orderId=${orderId}` : ""}`,
    );
  }, [router, orderId]);

  const handlePaymentError = useCallback((error: unknown) => {
    console.error("[stripe] Payment failed:", error);
    setError(getClientErrorMessage(error, "payment"));
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
              onSlotChange={setSelectedSlotSelection}
            />
          )}

          {step === 2 && (
            <Step2Summary
              userEmail={user?.email}
              isAsap={fulfillment.isAsap}
              scheduledTime={fulfillment.scheduledTime}
              pickupLabel={pickupLabel}
              instructions={fulfillment.instructions}
              rewardsAvailable={rewardsAvailable}
              rewardPreview={rewardPreview}
              useReward={useReward}
              onUseRewardChange={setUseReward}
              onBack={() => setStep(1)}
              onNext={handleProceedToPayment}
              loading={loading}
              error={error}
              customerProfile={profile}
              termsAccepted={termsAccepted}
              onTermsAcceptedChange={setTermsAccepted}
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
                orderId={orderId ?? ""}
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
