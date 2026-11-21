"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import PizzaPlate from "@/components/ui/PizzaPlate";
import PizzaWorkshop from "@/components/ui/PizzaWorkshop";
import SupplementPicker from "@/components/ui/SupplementPicker";
import { isDelizzaPizzaCategory } from "@/lib/pizza-duo";
import { useOnlineOrderingStatus } from "@/contexts/OnlineOrderingStatusContext";
import type { Product, ProductIngredient } from "@/types";
import type { CartItemCustomizations, SelectedOption } from "@/types/cart";
import type { ProductOption } from "@/types/product-options";
import { formatPrice } from "@/types";
import { isProductUnavailable } from "@/lib/product-availability";
import { useCart } from "@/contexts/CartContext";

interface ProductCustomizeModalProps {
  product: Product;
  onClose: () => void;
  onConfirm: (
    customizations: CartItemCustomizations,
    quantity: number,
    selectedOptions: SelectedOption[],
  ) => void;
  initialCustomizations?: CartItemCustomizations;
  initialSelectedOptions?: SelectedOption[];
  initialQuantity?: number;
  initialCartKey?: string;
  confirmLabel?: string;
}

function computeOptionsDeltaCents(
  product: Product,
  options: ProductOption[],
  selections: Record<string, string[]>,
): number {
  let delta = 0;
  for (const opt of options) {
    const choiceIds = selections[opt.id] ?? [];
    for (const choiceId of choiceIds) {
      const choice = opt.choices.find((c) => c.id === choiceId);
      if (!choice) continue;
      delta += optionChoiceDeltaCents(product, opt, choice);
    }
  }
  return delta;
}

function buildSelectedOptions(
  product: Product,
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
          priceDelta += optionChoiceDeltaCents(product, opt, choice);
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

function buildSelectedTemplateOptions(
  options: ProductOption[],
  selections: Record<string, string[]>,
): Record<string, string[]> {
  return Object.fromEntries(
    options
      .map((opt) => [opt.id, selections[opt.id] ?? []] as const)
      .filter(([, choiceIds]) => choiceIds.length > 0),
  );
}

function resolveIngredients(product: Product, ids: string[]): ProductIngredient[] {
  const byId = new Map(product.ingredientLibrary.map((ingredient) => [ingredient.id, ingredient]));
  return ids
    .map((id) => byId.get(id))
    .filter((ingredient): ingredient is ProductIngredient => ingredient !== undefined);
}

function resolveActiveIngredients(product: Product, ids: string[]): ProductIngredient[] {
  return resolveIngredients(product, ids).filter((ingredient) => ingredient.isActive);
}

function optionChoiceDeltaCents(
  product: Product,
  option: ProductOption,
  choice: ProductOption["choices"][number],
): number {
  const overridePrice = product.templatePriceOverrides[option.id]?.[choice.id];
  if (option.pricingMode === "absolute") {
    return (overridePrice ?? choice.absolutePrice?.amountCents ?? product.price_cents) - product.price_cents;
  }
  return overridePrice ?? choice.priceModifier.amountCents;
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
  initialCustomizations,
  initialSelectedOptions = [],
  initialQuantity = 1,
  initialCartKey,
  confirmLabel = "Ajouter au panier",
}: ProductCustomizeModalProps) {
  const onlineOrdering = useOnlineOrderingStatus();
  const dialogRef = useRef<HTMLDivElement>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const confirmed = useRef(false);
  const { canAddProductQuantity, canReplaceProductQuantity } = useCart();
  const legacyOptionIds = useMemo(
    () => new Set(product.legacyOptionIds ?? []),
    [product.legacyOptionIds],
  );
  const [selections, setSelections] = useState<Record<string, string[]>>(
    () => ({
      ...(initialCustomizations?.selectedTemplateOptions ?? {}),
      ...(initialCustomizations?.selectedLegacyOptions ?? {}),
      ...Object.fromEntries(initialSelectedOptions.map((option) => [option.optionId, option.choiceIds])),
    }),
  );
  const [removedIngredients, setRemovedIngredients] = useState<string[]>(() => initialCustomizations?.removedIngredients ?? []);
  const [addedSupplements, setAddedSupplements] = useState<string[]>(() => initialCustomizations?.addedSupplements ?? []);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [reviewing, setReviewing] = useState(false);

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

  const baseIngredients = useMemo(
    () => resolveIngredients(product, product.baseIngredientIds),
    [product],
  );
  const supplementIngredients = useMemo(
    () => resolveActiveIngredients(product, product.availableSupplementIds),
    [product],
  );
  const selectedSupplementIngredients = supplementIngredients.filter((ingredient) =>
    addedSupplements.includes(ingredient.id),
  );

  const supplementDeltasCents = selectedSupplementIngredients.reduce(
    (sum, ingredient) => sum + ingredient.defaultPriceModifier.amountCents,
    0,
  );
  const deltasCents =
    computeOptionsDeltaCents(product, sortedOptions, selections) +
    initialSelectedOptions
      .filter((option) => !sortedOptions.some((current) => current.id === option.optionId))
      .reduce((sum, option) => sum + option.priceDeltaCents, 0) +
    supplementDeltasCents;
  const unitPriceCents = product.price_cents + deltasCents;
  const totalTtcCents = unitPriceCents * quantity;
  const hasRequiredSelections = areRequiredOptionsFilled(sortedOptions, selections);
  const canAdd = hasRequiredSelections &&
    !isProductUnavailable(product) && (initialCartKey
      ? canReplaceProductQuantity(initialCartKey, product.id, quantity, product)
      : canAddProductQuantity(product.id, quantity, product));
  const orderingBlocked = !onlineOrdering.canStartOrder;
  const hasOptions = sortedOptions.length > 0;
  const hasIngredients = product.ingredients.length > 0;
  const hasRemovableIngredients = product.allowIngredientRemoval && baseIngredients.length > 0;
  const isPizza = isDelizzaPizzaCategory(product.category) && product.pizzaUnits === 1;
  const hasSupplements = supplementIngredients.length > 0;
  const hasCustomizations = hasOptions || hasRemovableIngredients || hasSupplements;
  const hasTags = product.tags.length > 0;
  const showIngredientLabels = hasIngredients && (!isPizza || !hasRemovableIngredients);
  const effectiveRemovals = hasRemovableIngredients
    ? baseIngredients.filter((ingredient) => removedIngredients.includes(ingredient.id))
    : [];
  const summaryDetails = [
    ...buildSelectedOptions(product, sortedOptions, selections).flatMap((option) => option.choiceNames),
    ...effectiveRemovals.map((ingredient) => `Sans ${ingredient.name}`),
    ...selectedSupplementIngredients.map((ingredient) => `+ ${ingredient.name}`),
  ];

  function toggleRemovedIngredient(ingredientId: string) {
    setRemovedIngredients((prev) =>
      prev.includes(ingredientId)
        ? prev.filter((id) => id !== ingredientId)
        : [...prev, ingredientId],
    );
  }

  function toggleSupplement(ingredientId: string) {
    setAddedSupplements((prev) =>
      prev.includes(ingredientId)
        ? prev.filter((id) => id !== ingredientId)
        : [...prev, ingredientId],
    );
  }

  const handleConfirm = () => {
    if (!canAdd || orderingBlocked || confirmed.current) return;
    confirmed.current = true;
    const selectedOptions = [
      ...initialSelectedOptions.filter((option) => !sortedOptions.some((current) => current.id === option.optionId)),
      ...buildSelectedOptions(product, sortedOptions, selections),
    ];
    const allSelectedOptions = buildSelectedTemplateOptions(sortedOptions, selections);
    const selectedTemplateOptions = Object.fromEntries(
      Object.entries(allSelectedOptions).filter(([optionId]) => !legacyOptionIds.has(optionId)),
    );
    const selectedLegacyOptions = Object.fromEntries(
      Object.entries(allSelectedOptions).filter(([optionId]) => legacyOptionIds.has(optionId)),
    );
    const customizations: CartItemCustomizations = {
      selectedTemplateOptions,
      selectedLegacyOptions,
      addedSupplements: selectedSupplementIngredients.map((ingredient) => ingredient.id),
      removedIngredients: effectiveRemovals.map((ingredient) => ingredient.id),
      addedSupplementSnapshots: selectedSupplementIngredients.map((ingredient) => ({
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        priceDeltaCents: ingredient.defaultPriceModifier.amountCents,
      })),
      removedIngredientSnapshots: effectiveRemovals.map((ingredient) => ({
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
      })),
    };
    onConfirm(customizations, quantity, selectedOptions);
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')).filter(element => element.getClientRects().length > 0);
    const first = focusable()[0];
    first?.focus({ preventScroll: true });
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const elements = focusable();
      const firstElement = elements[0];
      const lastElement = elements.at(-1);
      if (!firstElement || !lastElement) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === firstElement || !dialog.contains(document.activeElement))) {
        event.preventDefault(); lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault(); firstElement.focus();
      }
    };
    dialog.addEventListener("keydown", trap);
    return () => { dialog.removeEventListener("keydown", trap); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!isPizza) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isPizza]);

  function changeStep(review: boolean) {
    setReviewing(review);
    requestAnimationFrame(() => stepHeading.current?.focus());
  }

  const customizationContent = (
    <>
            {(showIngredientLabels || hasTags) && (
              <div className="mt-5 flex flex-col gap-4 border-b border-white/5 pb-5">
                {showIngredientLabels && (
                  <section aria-labelledby={`ingredients-${product.id}`}>
                    <h3 id={`ingredients-${product.id}`} className="text-[14px] font-bold text-[#F5F5F5]">
                      Ingrédients
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {product.ingredients.map((ingredient) => (
                        <span
                          key={ingredient}
                          className="rounded-full border border-white/10 bg-[#252525] px-3 py-1.5 text-[13px] text-[#D8D8D8]"
                        >
                          {ingredient}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {hasTags && (
                  <section aria-labelledby={`infos-${product.id}`}>
                    <h3 id={`infos-${product.id}`} className="text-[14px] font-bold text-[#F5F5F5]">
                      Informations
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {product.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[#D4A053]/12 px-3 py-1.5 text-[13px] text-[#E8C078]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* Options */}
            {sortedOptions.map((option) => {
              const selected = selections[option.id] ?? [];
              const isSingleChoice = option.type === "single" || option.pricingMode === "absolute";
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
                        isSingleChoice
                          ? selected[0] === choice.id
                          : selected.includes(choice.id);
                      const deltaCents = optionChoiceDeltaCents(product, option, choice);

                      return (
                        <button
                          key={choice.id}
                          type="button"
                          aria-pressed={isSelected}
                          disabled={orderingBlocked}
                          onClick={() =>
                            isSingleChoice
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
                            {isSingleChoice ? (
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
                          <span className={`text-[13px] ${deltaCents > 0 ? "text-[#A0A0A0]" : "text-[#6B6B6B]"}`}>
                            {deltaCents > 0
                              ? `+${formatPrice(deltaCents)} €`
                              : "Inclus"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {(hasRemovableIngredients || hasSupplements) && (
              <section className="mt-5">
                {!isPizza && <h3 className="text-[15px] font-bold text-[#F5F5F5]">Personnaliser</h3>}
                {hasRemovableIngredients && (
                <div className={isPizza ? "rounded-2xl border border-[#493b2c] bg-[#211b16] p-4" : "mt-3 flex flex-col gap-2"}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-[#F5F5F5]">Ingrédients de la recette</h4>
                    {isPizza && <span className="text-xs text-[#C7B9A9]">Appuyez pour retirer</span>}
                  </div>
                  <div className={isPizza ? "flex flex-wrap gap-2" : "flex flex-col gap-2"}>
                  {baseIngredients.map((ingredient) => {
                    const isRemoved = removedIngredients.includes(ingredient.id);
                    const isKept = !isRemoved;
                    return (
                      <button
                        key={ingredient.id}
                        type="button"
                        disabled={orderingBlocked}
                        aria-pressed={isPizza ? isRemoved : isKept}
                        aria-label={`${isRemoved ? "Remettre" : "Retirer"} ${ingredient.name}`}
                        onClick={() => toggleRemovedIngredient(ingredient.id)}
                        className={`min-h-11 border transition-colors ${isPizza ? "inline-flex items-center gap-2 rounded-full px-3 text-left text-[13px]" : "flex items-center justify-between rounded-[14px] px-4 py-3"} ${
                          isRemoved
                            ? "border-[#E74C3C]/40 bg-[#E74C3C]/10"
                            : "border-[#D4A053]/50 bg-[#D4A053]/15"
                        }`}
                      >
                        {isPizza ? (
                          <><span aria-hidden="true" className="font-bold text-[#E8C078]">{isRemoved ? "↶" : "×"}</span><span className={isRemoved ? "text-[#F59B90] line-through" : "text-[#F5F5F5]"}>{ingredient.name}</span></>
                        ) : <><div className="flex items-center gap-3">
                          <div className={`h-5 w-5 rounded-[5px] border-2 flex items-center justify-center shrink-0 ${isKept ? "border-[#D4A053] bg-[#D4A053]" : "border-[#505050]"}`}>
                            {isKept && (
                              <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3" aria-hidden="true">
                                <path d="M2 6l3 3 5-5" stroke="#0D0D0D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <span className={`text-[14px] ${isRemoved ? "text-[#F59B90] line-through" : "text-[#F5F5F5]"}`}>
                            {ingredient.emoji ? `${ingredient.emoji} ` : ""}{ingredient.name}
                          </span>
                        </div>
                        <span className="text-[13px] text-[#A0A0A0]">
                          {isRemoved ? "Retiré" : "Inclus"}
                        </span></>}
                      </button>
                    );
                  })}
                  </div>
                </div>
                )}
                {hasSupplements && (
                <div className="mt-5">
                  <h4 className="mb-2 text-sm font-bold text-[#F5F5F5]">{isPizza ? "Un petit supplément ?" : "Suppléments"}</h4>
                  <SupplementPicker
                    ingredients={supplementIngredients}
                    itemsClassName={isPizza ? "grid grid-cols-1 gap-2 sm:grid-cols-2" : "flex flex-col gap-2"}
                    renderIngredient={(ingredient) => {
                    const isAdded = addedSupplements.includes(ingredient.id);
                    const priceCents = ingredient.defaultPriceModifier.amountCents;
                    return (
                      <button
                        key={ingredient.id}
                        type="button"
                        disabled={orderingBlocked}
                        onClick={() => toggleSupplement(ingredient.id)}
                        aria-pressed={isAdded}
                        aria-label={`${isAdded ? "Retirer" : "Ajouter"} le supplément ${ingredient.name}`}
                        className={`flex min-h-12 gap-2 rounded-[14px] border px-3 py-2 text-left transition-colors ${isPizza ? "items-center" : "items-center justify-between"} ${
                          isAdded
                            ? "border-[#D4A053]/50 bg-[#D4A053]/15"
                            : "border-transparent bg-[#252525]"
                        }`}
                      >
                        {isPizza && ingredient.emoji && <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-md bg-[#211b16]">{ingredient.emoji}</span>}
                        <span className={isPizza ? "min-w-0 flex-1" : "contents"}>
                          <span className="block text-sm font-medium text-[#F5F5F5]">{!isPizza && ingredient.emoji ? `${ingredient.emoji} ` : ""}{ingredient.name}</span>
                          <span className="block text-xs text-[#DCC7AA]">{priceCents > 0 ? `+${formatPrice(priceCents)} €` : "Gratuit"}</span>
                        </span>
                        {isPizza && <span aria-hidden="true" className={`grid size-6 shrink-0 place-items-center rounded-full border font-bold ${isAdded ? "border-[#E8C078] bg-[#E8C078] text-[#21150a]" : "border-[#6D5842] text-[#E8C078]"}`}>{isAdded ? "✓" : "+"}</span>}
                      </button>
                    );
                    }}
                  />
                </div>
                )}
              </section>
            )}

    </>
  );

  const reviewContent = (
    <>
            <div className="mt-6 flex items-center justify-between">
              <span className="text-[14px] font-semibold text-[#F5F5F5]">Quantité</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={orderingBlocked}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Diminuer la quantité"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-[#252525] text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors text-[18px] font-bold leading-none"
                >
                  −
                </button>
                <span className="w-8 text-center text-[16px] font-bold text-[#F5F5F5]">
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={orderingBlocked || quantity >= 99 || !(initialCartKey
                    ? canReplaceProductQuantity(initialCartKey, product.id, quantity + 1, product)
                    : canAddProductQuantity(product.id, quantity + 1, product))}
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="Augmenter la quantité"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#D4A053] to-[#E8C078] text-[#0D0D0D] text-[18px] font-bold leading-none"
                >
                  +
                </button>
              </div>
            </div>
            <section aria-label="Récapitulatif" className="mt-6 rounded-[18px] border border-[#D4A053]/20 bg-[#D4A053]/5 p-4">
              <div className="flex justify-between gap-3 text-[14px] font-bold text-[#FFF5E1]">
                <span>{quantity} × {product.name}</span>
                <span className="shrink-0 text-[#E6BB72]">{formatPrice(totalTtcCents)}&nbsp;€</span>
              </div>
              {summaryDetails.length > 0 && (
                <ul className="mt-2 space-y-1 text-[13px] text-[#D8CEBD]">
                  {summaryDetails.map((label, index) => <li key={index}>{label}</li>)}
                </ul>
              )}
            </section>
    </>
  );

  if (isPizza) {
    const recipeBase = product.recipeBase === "creme" ? "crème" : product.recipeBase;
    const warning = orderingBlocked ? onlineOrdering.message ?? "Les commandes en ligne sont indisponibles."
      : reviewing && !canAdd ? "Cette quantité n’est plus disponible." : undefined;

    return (
      <div ref={dialogRef} className="fixed inset-0 z-[10001]" role="dialog" aria-modal="true" aria-label={`Détail de ${product.name}`}>
        <PizzaWorkshop
          title="Pizza classique"
          description={hasCustomizations ? "Personnalisez votre recette, puis vérifiez votre pizza avant de l’ajouter au panier." : "Vérifiez la composition de votre pizza et choisissez la quantité."}
          preview={<PizzaPlate product={product} />}
          previewTitle={product.name}
          previewDetails={<>{recipeBase && <strong>Base {recipeBase}</strong>}{recipeBase && product.description_short && <br />}{product.description_short}</>}
          unitPriceCents={unitPriceCents}
          totalCents={totalTtcCents}
          steps={hasCustomizations ? ["Personnaliser", "Vérifier"] : ["Vérifier"]}
          activeStep={hasCustomizations && reviewing ? 1 : 0}
          onClose={onClose}
          returnLabel={initialCartKey ? "Retour au panier" : "Retour à la carte"}
          onBack={hasCustomizations && reviewing ? () => changeStep(false) : undefined}
          actionLabel={!hasCustomizations || reviewing ? confirmLabel : "Vérifier ma pizza"}
          actionDisabled={orderingBlocked || (!hasCustomizations || reviewing ? !canAdd : !hasRequiredSelections)}
          onAction={!hasCustomizations || reviewing ? handleConfirm : () => changeStep(true)}
          warning={warning}
        >
          <h3 ref={stepHeading} tabIndex={-1} className="text-[clamp(1.65rem,3.3vw,2.2rem)] font-extrabold leading-tight tracking-tight outline-none">
            {!hasCustomizations || reviewing ? "Vérifiez votre pizza" : "À votre goût, vraiment."}
          </h3>
          {!hasCustomizations ? <>{customizationContent}{reviewContent}</> : reviewing ? reviewContent : customizationContent}
        </PizzaWorkshop>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <>
        <motion.div key="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm" aria-hidden="true" />
        <div className="pointer-events-none fixed inset-0 z-[10001] flex items-end justify-center md:items-center md:px-4">
        <motion.div
          key="modal-sheet"
          ref={dialogRef}
          initial={{ opacity: 0, y: 32, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 32, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="relative pointer-events-auto flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[24px] border border-[#D4A053]/20 bg-[#13110F] shadow-[0_-8px_40px_rgba(0,0,0,0.6)] md:max-h-[88dvh] md:max-w-[720px] md:rounded-[22px] md:shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
          role="dialog"
          aria-modal="true"
          aria-label={`Détail de ${product.name}`}
        >
          <div className="flex shrink-0 justify-center pb-1 pt-3" aria-hidden="true"><div className="h-1 w-10 rounded-full bg-white/20" /></div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="absolute right-3 top-3 z-10 grid size-11 place-items-center rounded-full bg-[#252525] text-xl text-[#F5F5F5]">×</button>
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4 md:px-6">
            <div className="grid items-center gap-4 border-b border-[#D4A053]/15 py-4 sm:grid-cols-[minmax(0,220px)_1fr] sm:gap-7">
              <div className="relative mx-auto aspect-[4/3] w-full max-w-[260px] overflow-hidden rounded-[18px] bg-[#252525]">
                <Image src={product.image} alt={product.name} fill sizes="260px" className="object-cover" />
              </div>
              <div className="flex min-w-0 flex-col items-center gap-2 text-center sm:items-start sm:text-left">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#E6BB72]">À la carte</p>
                <h2 className="text-[24px] font-bold leading-tight text-[#FFF5E1] md:text-[30px]">{product.name}</h2>
                <p className="text-[14px] font-semibold text-[#E6BB72]">{hasCustomizations ? "À partir de " : ""}{formatPrice(product.price_cents)}&nbsp;€</p>
                {product.description_short && <p className="max-w-[44ch] text-[14px] leading-relaxed text-[#CFC4B2]">{product.description_short}</p>}
              </div>
            </div>
            {customizationContent}
            {reviewContent}
          </div>

          {/* Sticky footer: Add button */}
          <div className="shrink-0 border-t border-white/5 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {orderingBlocked && onlineOrdering.message && (
              <div className="mb-3 rounded-[14px] border border-[#E74C3C]/30 bg-[#E74C3C]/10 px-4 py-3 text-[13px] leading-relaxed text-[#F5F5F5]">
                {onlineOrdering.message}
              </div>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canAdd || orderingBlocked}
              className="w-full rounded-[18px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] py-4 text-[16px] font-bold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)] disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {orderingBlocked
                ? "Commande indisponible"
                : canAdd
                ? `${confirmLabel} — ${formatPrice(totalTtcCents)} €`
                : hasRequiredSelections ? "Quantité indisponible" : "Veuillez compléter les options obligatoires"}
            </button>
          </div>
        </motion.div>
        </div>
      </>
    </AnimatePresence>
  );
}
