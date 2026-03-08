"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import type { Product } from "@/types";
import type { SelectedOption } from "@/types/cart";
import type { ProductOption } from "@/types/product-options";
import { formatPrice, computeTtcCents } from "@/types";

interface ProductCustomizeModalProps {
  product: Product;
  onClose: () => void;
  onConfirm: (selectedOptions: SelectedOption[], quantity: number) => void;
}

function computeOptionsDeltaCents(
  options: ProductOption[],
  selections: Record<string, string[]>,
): number {
  let delta = 0;
  for (const opt of options) {
    const choiceIds = selections[opt.id] ?? [];
    for (const choiceId of choiceIds) {
      const choice = opt.choices.find((c) => c.id === choiceId);
      if (choice) delta += choice.priceModifier.amountCents;
    }
  }
  return delta;
}

function buildSelectedOptions(
  options: ProductOption[],
  selections: Record<string, string[]>,
): SelectedOption[] {
  return options
    .map((opt): SelectedOption | null => {
      const choiceIds = selections[opt.id] ?? [];
      if (choiceIds.length === 0) return null;
      const choiceNames: string[] = [];
      let priceDelta = 0;
      for (const choiceId of choiceIds) {
        const choice = opt.choices.find((c) => c.id === choiceId);
        if (choice) {
          choiceNames.push(choice.name);
          priceDelta += choice.priceModifier.amountCents;
        }
      }
      return {
        optionId: opt.id,
        optionName: opt.name,
        choiceIds,
        choiceNames,
        priceDeltaCents: priceDelta,
      };
    })
    .filter((o): o is SelectedOption => o !== null);
}

function areRequiredOptionsFilled(
  options: ProductOption[],
  selections: Record<string, string[]>,
): boolean {
  return options
    .filter((opt) => opt.required)
    .every((opt) => (selections[opt.id] ?? []).length > 0);
}

export default function ProductCustomizeModal({
  product,
  onClose,
  onConfirm,
}: ProductCustomizeModalProps) {
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);

  const sortedOptions = useMemo(
    () => [...product.options].sort((a, b) => a.order - b.order),
    [product.options],
  );

  const handleSingleSelect = useCallback((optionId: string, choiceId: string) => {
    setSelections((prev) => ({ ...prev, [optionId]: [choiceId] }));
  }, []);

  const handleMultiToggle = useCallback((optionId: string, choiceId: string) => {
    setSelections((prev) => {
      const current = prev[optionId] ?? [];
      const next = current.includes(choiceId)
        ? current.filter((id) => id !== choiceId)
        : [...current, choiceId];
      return { ...prev, [optionId]: next };
    });
  }, []);

  const deltasCents = computeOptionsDeltaCents(sortedOptions, selections);
  const unitPriceCents = product.price_cents + deltasCents;
  const totalTtcCents = computeTtcCents(unitPriceCents, product.tax_rate_bps) * quantity;
  const canAdd = areRequiredOptionsFilled(sortedOptions, selections);

  const handleConfirm = () => {
    if (!canAdd) return;
    const selectedOptions = buildSelectedOptions(sortedOptions, selections);
    onConfirm(selectedOptions, quantity);
  };

  return (
    <AnimatePresence>
      <>
        {/* Backdrop */}
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[9990] bg-black/70 backdrop-blur-sm"
          aria-hidden="true"
        />

        {/* Bottom sheet */}
        <motion.div
          key="modal-sheet"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="fixed bottom-0 left-0 right-0 z-[9991] flex flex-col max-h-[92dvh] rounded-t-[24px] bg-[#1A1A1A] shadow-[0_-8px_40px_rgba(0,0,0,0.6)]"
          aria-modal="true"
          role="dialog"
          aria-label={`Personnaliser ${product.name}`}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-white/20" />
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#252525] text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Scrollable content */}
          <div className="overflow-y-auto overscroll-contain flex-1 px-5 pb-4">
            {/* Product header */}
            <div className="flex gap-4 py-4 border-b border-white/5">
              <div className="relative h-20 w-20 shrink-0 rounded-[14px] overflow-hidden bg-[#252525]">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col justify-center gap-1">
                <h2 className="text-[17px] font-bold text-[#F5F5F5] leading-tight">
                  {product.name}
                </h2>
                <p className="text-[14px] font-semibold text-[#D4A053]">
                  À partir de {formatPrice(computeTtcCents(product.price_cents, product.tax_rate_bps))}&nbsp;€
                </p>
              </div>
            </div>

            {/* Options */}
            {sortedOptions.map((option) => {
              const selected = selections[option.id] ?? [];
              return (
                <div key={option.id} className="mt-5">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-[15px] font-bold text-[#F5F5F5]">
                      {option.name}
                    </h3>
                    {option.required && (
                      <span className="rounded-full bg-[#D4A053]/20 px-2 py-0.5 text-[11px] font-semibold text-[#D4A053]">
                        Obligatoire
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {option.choices.map((choice) => {
                      const isSelected =
                        option.type === "single"
                          ? selected[0] === choice.id
                          : selected.includes(choice.id);

                      return (
                        <button
                          key={choice.id}
                          type="button"
                          onClick={() =>
                            option.type === "single"
                              ? handleSingleSelect(option.id, choice.id)
                              : handleMultiToggle(option.id, choice.id)
                          }
                          className={`flex items-center justify-between rounded-[14px] px-4 py-3 transition-colors ${
                            isSelected
                              ? "bg-[#D4A053]/15 border border-[#D4A053]/50"
                              : "bg-[#252525] border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Radio or Checkbox indicator */}
                            {option.type === "single" ? (
                              <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? "border-[#D4A053]" : "border-[#505050]"}`}>
                                {isSelected && (
                                  <div className="h-2.5 w-2.5 rounded-full bg-[#D4A053]" />
                                )}
                              </div>
                            ) : (
                              <div className={`h-5 w-5 rounded-[5px] border-2 flex items-center justify-center shrink-0 ${isSelected ? "border-[#D4A053] bg-[#D4A053]" : "border-[#505050]"}`}>
                                {isSelected && (
                                  <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3" aria-hidden="true">
                                    <path d="M2 6l3 3 5-5" stroke="#0D0D0D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                            )}
                            <span className="text-[14px] text-[#F5F5F5]">
                              {choice.name}
                            </span>
                          </div>
                          <span className={`text-[13px] ${choice.priceModifier.amountCents > 0 ? "text-[#A0A0A0]" : "text-[#6B6B6B]"}`}>
                            {choice.priceModifier.amountCents > 0
                              ? `+${formatPrice(choice.priceModifier.amountCents)} €`
                              : "Inclus"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Quantity selector */}
            <div className="mt-6 flex items-center justify-between">
              <span className="text-[14px] font-semibold text-[#F5F5F5]">Quantité</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Diminuer la quantité"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#252525] text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors text-[18px] font-bold leading-none"
                >
                  −
                </button>
                <span className="w-8 text-center text-[16px] font-bold text-[#F5F5F5]">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="Augmenter la quantité"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#D4A053] to-[#E8C078] text-[#0D0D0D] text-[18px] font-bold leading-none"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Sticky footer: Add button */}
          <div className="shrink-0 border-t border-white/5 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canAdd}
              className="w-full rounded-[18px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] py-4 text-[16px] font-bold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)] disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {canAdd
                ? `Ajouter — ${formatPrice(totalTtcCents)} €`
                : "Veuillez compléter les options obligatoires"}
            </button>
          </div>
        </motion.div>
      </>
    </AnimatePresence>
  );
}
