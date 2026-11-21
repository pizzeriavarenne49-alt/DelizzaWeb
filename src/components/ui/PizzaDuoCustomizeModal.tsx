"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { formatPrice, type Product } from "@/types";
import type { CartItem, PizzaDuoComposition, PizzaDuoSupplementSelection, PizzaDuoSupplementTarget } from "@/types/cart";
import { PIZZA_DUO_FIXED_PRICE_CENTS, createPizzaDuoComposition, getPizzaDuoBaseIngredients, getPizzaDuoIngredientNames, isPizzaDuoRecipe } from "@/lib/pizza-duo";
import { getPizzaDuoSupplementOptions, getPizzaDuoSupplementPriceCents, getPizzaDuoUnitPriceCents, normalizePizzaDuoSupplementSelections, pizzaDuoSupplementTargetLabel } from "@/lib/pizza-duo";
import { useCart } from "@/contexts/CartContext";
import { useCatalogAvailability } from "@/contexts/CatalogAvailabilityContext";
import { isCartItemStockAvailable } from "@/lib/product-availability";
import { useOnlineOrderingStatus } from "@/contexts/OnlineOrderingStatusContext";
import PizzaDuoVisual from "@/components/ui/PizzaDuoVisual";
import PizzaWorkshop from "@/components/ui/PizzaWorkshop";
import SupplementPicker from "@/components/ui/SupplementPicker";

interface Props {
  product: Product; recipes: Product[]; initial?: PizzaDuoComposition;
  initialQuantity?: number; editingCartKey?: string; onClose: () => void;
  onConfirm: (composition: PizzaDuoComposition, quantity: number) => void;
}
type Side = "left" | "right";
type Stage = { page: "recipe" | "customize"; side: Side; returnToReview?: boolean } | { page: "whole" | "review" };
type OpenPanel = "removals" | "supplements" | null;

const RECIPES_PER_PAGE = 4;
const headingClass = "text-[clamp(1.5rem,3vw,2.4rem)] font-extrabold leading-tight tracking-[-.045em] text-[#FFF5E1] outline-none";
const optionPanelClass = "rounded-[16px] border border-[#5b4630] bg-[#211a14]";
const panelButtonClass = "flex min-h-12 w-full items-center justify-between gap-3 rounded-[16px] px-4 py-2 text-left text-sm font-bold text-[#F6EEE1] hover:bg-[#302517] focus-visible:outline-2 focus-visible:outline-[#E8C078]";
const pageButtonClass = "min-h-11 rounded-xl border border-[#584634] px-2.5 text-xs font-semibold text-[#F0D5A8] hover:border-[#D4A053] disabled:opacity-35";

const normalizedBase = (base?: string) => base === "crème" ? "creme" : base ?? "other";
const baseLabel = (base?: string) => {
  const value = normalizedBase(base);
  if (value === "creme") return "Crème";
  if (value === "tomate") return "Tomate";
  return value === "other" ? "Autre" : `${value[0].toUpperCase()}${value.slice(1)}`;
};

export default function PizzaDuoCustomizeModal({ product, recipes, initial, initialQuantity = 1, editingCartKey, onClose, onConfirm }: Props) {
  const { items } = useCart();
  const availability = useCatalogAvailability();
  const onlineOrdering = useOnlineOrderingStatus();
  const eligible = useMemo(() => recipes.filter(isPizzaDuoRecipe), [recipes]);
  const [leftId, setLeftId] = useState(initial?.leftRecipeId ?? "");
  const [rightId, setRightId] = useState(initial?.rightRecipeId ?? "");
  const [filter, setFilter] = useState("all");
  const [recipePage, setRecipePage] = useState(0);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [stage, setStage] = useState<Stage>(initial ? { page: "review" } : { page: "recipe", side: "left" });
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [openSupplementId, setOpenSupplementId] = useState<string>();
  const [supplementSelections, setSupplementSelections] = useState<PizzaDuoSupplementSelection[]>(() =>
    normalizePizzaDuoSupplementSelections((initial?.supplements ?? []).map(({ ingredientId, target }) => ({ ingredientId, target }))),
  );
  const [removedIngredientIds, setRemovedIngredientIds] = useState<{ left: string[]; right: string[] }>(() => ({
    left: initial?.leftRecipe.removedIngredients?.map(({ ingredientId }) => ingredientId) ?? [],
    right: initial?.rightRecipe.removedIngredients?.map(({ ingredientId }) => ingredientId) ?? [],
  }));
  const [baseOverrides, setBaseOverrides] = useState<{ left?: "tomate" | "crème"; right?: "tomate" | "crème" }>(() => ({
    ...(initial?.leftRecipe.baseOverride ? { left: initial.leftRecipe.baseOverride } : {}),
    ...(initial?.rightRecipe.baseOverride ? { right: initial.rightRecipe.baseOverride } : {}),
  }));
  const dialog = useRef<HTMLDivElement>(null);
  const workshopScroll = useRef<HTMLDivElement>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const confirmLock = useRef(false);
  const left = eligible.find((recipe) => recipe.id === leftId);
  const right = eligible.find((recipe) => recipe.id === rightId);
  const selectedRecipes = { left, right };
  const activeStage: Stage = "side" in stage || (left && right)
    ? stage
    : { page: "recipe", side: left ? "right" : "left", returnToReview: true };
  const side = "side" in activeStage ? activeStage.side : "right";
  const returnToReview = "side" in activeStage && activeStage.returnToReview;
  const current = selectedRecipes[side];
  const page = activeStage.page === "customize" && !current ? "recipe" : activeStage.page;
  const bases = useMemo(() => ["all", ...new Set(eligible.map((recipe) => normalizedBase(recipe.recipeBase)))], [eligible]);
  const activeFilter = bases.includes(filter) ? filter : "all";
  const visible = activeFilter === "all" ? eligible : eligible.filter((recipe) => normalizedBase(recipe.recipeBase) === activeFilter);
  const recipePageCount = Math.max(1, Math.ceil(visible.length / RECIPES_PER_PAGE));
  const currentRecipePage = Math.min(recipePage, recipePageCount - 1);
  const isEditing = Boolean(initial);
  const itemsOutsideEditedLine = useMemo(() => editingCartKey ? items.filter((item) => item.cartKey !== editingCartKey) : items, [editingCartKey, items]);
  const hasCompleteSelection = Boolean(left && right);
  const canReviewAfterHalf = hasCompleteSelection && (side === "right" || returnToReview);
  const composition = left && right
    ? createPizzaDuoComposition(left, right, supplementSelections, product, removedIngredientIds, baseOverrides)
    : undefined;
  const partialSupplements = composition ? [] : supplementSelections.flatMap(({ ingredientId, target }) => {
    const option = getPizzaDuoSupplementOptions(left, right, target, product).find(({ id }) => id === ingredientId);
    return option ? [{ ingredientId, target, priceDeltaCents: getPizzaDuoSupplementPriceCents(option.defaultPriceModifier.amountCents, target) }] : [];
  });
  const validSupplements = composition?.supplements ?? partialSupplements;
  const unitPriceCents = composition
    ? getPizzaDuoUnitPriceCents(composition)
    : PIZZA_DUO_FIXED_PRICE_CENTS + partialSupplements.reduce((total, { priceDeltaCents }) => total + priceDeltaCents, 0);
  const isQuantityAvailable = (nextQuantity: number) => {
    if (!composition) return false;
    const candidate: CartItem = {
      catalogItemId: product.id, catalogKind: "pizza_duo", quantity: nextQuantity,
      duo: composition, nameSnapshot: product.name,
      unitPriceCents, totalCents: unitPriceCents * nextQuantity,
      taxRateBps: product.tax_rate_bps, cartKey: "modal-candidate",
    };
    return isCartItemStockAvailable(itemsOutsideEditedLine, candidate, availability);
  };
  const stockAvailable = hasCompleteSelection && isQuantityAvailable(quantity);
  const canConfirm = stockAvailable && onlineOrdering.canStartOrder && Boolean(composition);
  const selectionRemoved = Boolean((leftId && !left) || (rightId && !right));

  useEffect(() => {
    const opener = document.activeElement;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = priorOverflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    workshopScroll.current?.scrollTo({ top: 0 });
    stepHeading.current?.focus({ preventScroll: true });
  }, [page, side]);
  useEffect(() => {
    if (openSupplementId) {
      document.getElementById(`duo-extra-scope-${openSupplementId}`)?.scrollIntoView({ block: "nearest" });
    }
  }, [openSupplementId]);

  function goTo(next: Stage) {
    setStage(next);
    setOpenPanel(null);
    setOpenSupplementId(undefined);
    if (next.page === "recipe") {
      setFilter("all");
      setRecipePage(0);
    }
  }

  function choose(recipe: Product) {
    if (recipe.id !== current?.id) {
      if (side === "left") setLeftId(recipe.id);
      else setRightId(recipe.id);
      setRemovedIngredientIds((previous) => ({ ...previous, [side]: [] }));
      setBaseOverrides((previous) => ({ ...previous, [side]: undefined }));
      const nextLeft = side === "left" ? recipe : left;
      const nextRight = side === "right" ? recipe : right;
      setSupplementSelections((previous) => previous.filter(({ ingredientId, target }) =>
        getPizzaDuoSupplementOptions(nextLeft, nextRight, target, product).some(({ id }) => id === ingredientId)));
    }
    goTo({ page: "customize", side, returnToReview });
  }

  function edit(target: Side) {
    goTo({ page: "customize", side: target, returnToReview: true });
  }

  function changeRecipe() {
    goTo({ page: "recipe", side, returnToReview });
  }

  function advance() {
    if (page === "recipe") {
      if (current) choose(current);
      return;
    }
    if (page === "whole" || canReviewAfterHalf) {
      goTo({ page: "review" });
      return;
    }
    const nextSide = side === "left" ? "right" : "left";
    goTo({ page: selectedRecipes[nextSide] ? "customize" : "recipe", side: nextSide });
  }

  function back() {
    if (page === "whole" || (returnToReview && hasCompleteSelection && page === "customize")) goTo({ page: "review" });
    else if (page === "review") goTo({ page: "customize", side: "right" });
    else if (page === "customize") changeRecipe();
    else if (current && (side === "left" || returnToReview)) goTo({ page: "customize", side, returnToReview });
    else goTo({ page: "customize", side: "left" });
  }

  function confirm() {
    if (confirmLock.current || !composition || !canConfirm) return;
    confirmLock.current = true;
    onConfirm(composition, quantity);
  }
  function setIngredientTarget(ingredientId: string, target?: PizzaDuoSupplementTarget) {
    setSupplementSelections((previous) => {
      const rest = previous.filter((item) => item.ingredientId !== ingredientId);
      if (!target) return rest;
      return rest.length < 40 ? rest.concat({ ingredientId, target }) : previous;
    });
    setOpenSupplementId(undefined);
    dialog.current?.querySelector<HTMLButtonElement>(`[data-duo-supplement="${CSS.escape(ingredientId)}"]`)?.focus({ preventScroll: true });
  }

  function togglePanel(panel: Exclude<OpenPanel, null>) {
    setOpenPanel((previous) => previous === panel ? null : panel);
    setOpenSupplementId(undefined);
  }
  function toggleRemovedIngredient(target: Side, ingredientId: string) {
    setRemovedIngredientIds((previous) => ({
      ...previous,
      [target]: previous[target].includes(ingredientId)
        ? previous[target].filter((id) => id !== ingredientId)
        : previous[target].concat(ingredientId),
    }));
  }
  function selectBaseOverride(target: Side, selectedBase: "tomate" | "crème", defaultBase: "tomate" | "crème") {
    setBaseOverrides((previous) => ({ ...previous, [target]: selectedBase === defaultBase ? undefined : selectedBase }));
  }
  const previewTitle = left && right ? `${left.name} × ${right.name}` : product.name;
  const warning = !onlineOrdering.canStartOrder
    ? (onlineOrdering.message ?? "Les commandes en ligne sont indisponibles.")
    : !stockAvailable && hasCompleteSelection
      ? "Stock insuffisant pour cette composition ou cette quantité."
      : undefined;
  const supplementTarget = page === "whole" ? "whole" : side;
  const supplementOptions = getPizzaDuoSupplementOptions(left, right, supplementTarget, product);
  const wholeSupplementIds = new Set(getPizzaDuoSupplementOptions(left, right, "whole", product).map(({ id }) => id));
  const selectedTargets = new Map(validSupplements.map(({ ingredientId, target }) => [ingredientId, target]));
  const currentHalfSupplementCount = validSupplements.filter(({ target }) => target === side || target === "whole").length;
  const removableIngredients = current?.allowIngredientRemoval ? getPizzaDuoBaseIngredients(current) : [];
  const defaultBase = normalizedBase(current?.recipeBase) === "tomate" ? "tomate"
    : normalizedBase(current?.recipeBase) === "creme" ? "crème" : undefined;
  const halfLabel = pizzaDuoSupplementTargetLabel(side);
  const goesToOtherHalf = page === "customize" && !canReviewAfterHalf;
  const canGoBack = page !== "recipe" || side === "right" || Boolean(current);
  const actionLabel = page === "review" ? (isEditing ? "Enregistrer les modifications" : "Ajouter au panier")
    : page === "recipe" ? "Personnaliser cette moitié"
    : goesToOtherHalf ? (side === "left" ? "Passer à la moitié 2" : "Passer à la moitié 1")
    : "Vérifier ma pizza";
  const actionTestId = page === "review" ? "pizza-duo-confirm"
    : page === "recipe" ? "pizza-duo-selected-recipe"
    : goesToOtherHalf ? "pizza-duo-next-half"
    : "pizza-duo-review";

  function renderSupplementOptions() {
    if (!supplementOptions.length) {
      return <p className="text-sm text-[#C8BDAE]">{supplementTarget === "whole" ? "Aucun supplément disponible pour la pizza entière." : "Aucun supplément disponible pour cette moitié."}</p>;
    }
    return <SupplementPicker
      ingredients={supplementOptions}
      itemsClassName="grid grid-cols-2 items-start gap-2"
      renderIngredient={(ingredient) => {
        const selectedTarget = selectedTargets.get(ingredient.id);
        const selected = selectedTarget === supplementTarget || selectedTarget === "whole";
        const editingWhole = supplementTarget === "whole";
        const expanded = !editingWhole && openSupplementId === ingredient.id;
        const choiceId = `duo-extra-scope-${ingredient.id}`;
        const fullPriceCents = ingredient.defaultPriceModifier.amountCents;
        const price = (target: PizzaDuoSupplementTarget) => `+ ${formatPrice(getPizzaDuoSupplementPriceCents(fullPriceCents, target))} €`;
        const selectionLabel = selectedTarget === "whole" && !editingWhole ? "Sur les deux moitiés"
          : selectedTarget && !selected && !editingWhole ? "Sur l’autre moitié" : undefined;
        const scopeOptions: { target: PizzaDuoSupplementTarget; label: string }[] = [{ target: side, label: "Cette moitié" }];
        if (wholeSupplementIds.has(ingredient.id)) scopeOptions.push({ target: "whole", label: "Toute la pizza" });
        return <div key={ingredient.id} className={`min-w-0 overflow-hidden rounded-xl border ${selected || expanded ? "border-[#E8C078] bg-[#352817]" : "border-[#493a2c] bg-[#211a14] hover:border-[#89623a]"}`}>
          <button type="button" data-duo-supplement={ingredient.id}
            onClick={() => editingWhole ? setIngredientTarget(ingredient.id, selected ? undefined : "whole") : setOpenSupplementId(expanded ? undefined : ingredient.id)}
            aria-pressed={editingWhole ? selected : undefined} aria-expanded={editingWhole ? undefined : expanded}
            aria-controls={expanded ? choiceId : undefined}
            className="flex min-h-12 w-full items-center gap-2 rounded-xl p-2 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#E8C078] sm:px-3">
            <span aria-hidden="true" className={`grid size-5 shrink-0 place-items-center rounded-full border ${selected ? "border-[#E8C078] bg-[#E8C078] text-[#21150a]" : "border-[#806646] text-[#E8C078]"}`}>
              <svg className="size-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" focusable="false">
                <path d={selected ? "m2.5 6 2.25 2.25 4.75-4.5" : expanded ? "M3 6h6" : "M3 6h6M6 3v6"} />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block break-words text-xs font-bold text-[#F6EEE1] sm:text-sm">{ingredient.name}</span>
              <span className="block text-[11px] text-[#D7C0A2]">{selectionLabel ?? price(supplementTarget)}</span>
            </span>
          </button>
          {expanded && <div id={choiceId} role="group" aria-label={`Votre choix pour ${ingredient.name}`} className="scroll-mb-28 space-y-1.5 border-t border-[#6d5132] p-1.5 sm:p-2">
            {scopeOptions.map(({ target, label }) => <button key={target} type="button" data-duo-extra-target={target} aria-pressed={selectedTarget === target}
              onClick={() => setIngredientTarget(ingredient.id, target)}
              className={`block min-h-10 w-full rounded-lg border px-2 py-1.5 text-left text-[11px] font-semibold leading-tight focus-visible:outline-2 focus-visible:outline-[#E8C078] sm:text-xs ${selectedTarget === target ? "border-[#E8C078] bg-[#E8C078] text-[#21150a]" : "border-[#6d5132] bg-[#211a14] text-[#F6EEE1] hover:border-[#E8C078]"}`}>
              <span className="block">{label}</span><span className="block whitespace-nowrap">{price(target)}</span>
            </button>)}
            {selected && <button type="button" data-duo-extra-target="remove" onClick={() => setIngredientTarget(ingredient.id, selectedTarget === "whole" ? (side === "left" ? "right" : "left") : undefined)}
              className="min-h-10 w-full rounded-lg px-2 text-left text-[11px] font-semibold text-[#E8C078] hover:underline focus-visible:outline-2 focus-visible:outline-[#E8C078]">Retirer de cette moitié</button>}
          </div>}
        </div>;
      }}
    />;
  }

  return (
    <div ref={dialog} className="fixed inset-0 z-[10001] bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="pizza-duo-title"
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.stopPropagation(); onClose(); return; }
        if (event.key !== "Tab") return;
        const controls = dialog.current?.querySelectorAll<HTMLElement>("button:not(:disabled),input:not(:disabled),summary");
        if (!controls?.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}>
      <PizzaWorkshop
        title="Pizza Duo · 2 moitiés"
        titleId="pizza-duo-title"
        description="Choisissez deux recettes parmi vos pizzas préférées. Votre Pizza Duo est à 14,90 € hors suppléments."
        preview={<PizzaDuoVisual left={left} right={right} imageSizes="(min-width: 1024px) 340px, (min-width: 640px) 112px, 76px" />}
        previewTitle={previewTitle}
        previewDetails={(["left", "right"] as const).map((target) => {
          const recipe = selectedRecipes[target];
          return <span key={target} className="block">{pizzaDuoSupplementTargetLabel(target)} · {recipe ? `Base ${baseOverrides[target] ?? baseLabel(recipe.recipeBase)}` : "À choisir"}</span>;
        })}
        unitPriceCents={unitPriceCents}
        totalCents={unitPriceCents * quantity}
        steps={["Moitié 1", "Moitié 2", "Récapitulatif"]}
        activeStep={page === "review" || page === "whole" ? 2 : side === "left" ? 0 : 1}
        compact
        scrollRef={workshopScroll}
        onClose={onClose}
        returnLabel={isEditing ? "Retour au panier" : "Retour à la carte"}
        onBack={canGoBack ? back : undefined}
        actionLabel={actionLabel}
        actionDisabled={page === "review" ? !canConfirm : page === "recipe" && !current}
        actionTestId={actionTestId}
        onAction={page === "review" ? confirm : advance}
        warning={warning}
      >
        {page === "recipe" ? <section aria-labelledby="duo-step">
          <h3 id="duo-step" ref={stepHeading} tabIndex={-1} className={headingClass}>Choisissez la {halfLabel.toLowerCase()}</h3>
          {side === "right" && left && <p className="mt-1.5 text-sm text-[#C8BDAE]">Première moitié · {left.name}</p>}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrer par base">
            {bases.map((base) => <button key={base} type="button" onClick={() => { setFilter(base); setRecipePage(0); }} aria-pressed={activeFilter === base} className={`min-h-10 shrink-0 rounded-full px-3 text-xs font-bold ${activeFilter === base ? "bg-[#E8C078] text-[#21150a]" : "border border-[#4c3b2c] bg-[#211a14] text-[#E4D5C1]"}`}>{base === "all" ? "Toutes" : baseLabel(base)}</button>)}
          </div>
          {selectionRemoved && <p role="status" className="mt-3 rounded-xl bg-[#392825] px-3 py-2 text-sm text-[#FFC3B9]">Une recette sélectionnée n’est plus disponible. Choisissez-en une autre.</p>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {visible.slice(currentRecipePage * RECIPES_PER_PAGE, (currentRecipePage + 1) * RECIPES_PER_PAGE).map((recipe) => {
              const selected = current?.id === recipe.id;
              return <button key={recipe.id} data-duo-recipe={recipe.id} type="button" onClick={() => choose(recipe)} aria-pressed={selected} className={`group flex min-h-[60px] min-w-0 items-center gap-2 rounded-[15px] border p-2 text-left transition-colors sm:min-h-[72px] sm:gap-3 sm:p-2.5 ${selected ? "border-[#D7A95C] bg-[#352817] shadow-[inset_0_0_0_1px_rgba(232,192,120,.18)]" : "border-[#46382b] bg-[#211a14] hover:border-[#8b663d]"}`}>
                <Image src={recipe.image} alt="" width={56} height={56} sizes="(min-width: 640px) 56px, 36px" className="size-9 shrink-0 rounded-[10px] object-cover sm:size-14" />
                <span className="min-w-0 flex-1"><span className="block break-words text-xs font-bold text-[#F6EEE1] sm:text-sm">{recipe.name}</span><span className="mt-0.5 block text-[11px] text-[#E4BB78]">Base {baseLabel(recipe.recipeBase)}</span><span className="mt-1 hidden truncate text-[10px] text-[#C7BBAA] sm:block">{getPizzaDuoIngredientNames(recipe).join(", ")}</span></span>
              </button>;
            })}
          </div>
          {recipePageCount > 1 && <div className="mt-3 flex items-center justify-between gap-2" role="group" aria-label="Pages de recettes">
            <button type="button" disabled={currentRecipePage === 0} onClick={() => setRecipePage(currentRecipePage - 1)} className={pageButtonClass}>Précédentes</button>
            <span aria-live="polite" className="text-xs tabular-nums text-[#C8BDAE]">{currentRecipePage + 1} / {recipePageCount}</span>
            <button type="button" disabled={currentRecipePage === recipePageCount - 1} onClick={() => setRecipePage(currentRecipePage + 1)} className={pageButtonClass}>Suivantes</button>
          </div>}
          {eligible.length === 0 && <p className="mt-3 text-sm text-[#F4B6A2]">Aucune recette disponible pour une Pizza Duo.</p>}
        </section> : page === "customize" ? <section aria-labelledby="duo-step">
          <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#E8C078]">{halfLabel}</p>
          <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 id="duo-step" ref={stepHeading} tabIndex={-1} className={headingClass}>{current?.name}</h3>
            <button type="button" onClick={changeRecipe} className="min-h-10 text-xs font-bold text-[#E8C078] hover:underline">Changer de recette</button>
          </div>
          <div className="mt-3 space-y-2.5">
            {defaultBase && <section className={`${optionPanelClass} p-3`} aria-labelledby="duo-bases-title">
              <div className="flex items-center justify-between gap-2">
                <h4 id="duo-bases-title" className="text-sm font-bold text-[#F6EEE1]">Choisir la base</h4>
                <span className="text-xs text-[#C7B498]">Sans supplément</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["tomate", "crème"] as const).map((base) => {
                  const selected = (baseOverrides[side] ?? defaultBase) === base;
                  return <button key={base} type="button" onClick={() => selectBaseOverride(side, base, defaultBase)} aria-pressed={selected} className={`min-h-10 rounded-xl border px-3 text-xs font-bold ${selected ? "border-[#E8C078] bg-[#352817] text-[#F7DCA9]" : "border-[#5b4936] text-[#E7D8C5]"}`}>Base {base}</button>;
                })}
              </div>
            </section>}
            <section className={optionPanelClass} aria-label="Ingrédients de la recette">
              {removableIngredients.length > 0 ? <>
                <button type="button" aria-expanded={openPanel === "removals"} aria-controls="duo-removal-options" onClick={() => togglePanel("removals")} className={panelButtonClass}>
                  <span>Retirer des ingrédients</span>
                  <span aria-hidden="true" className="shrink-0 text-xs text-[#E8C078]">{removedIngredientIds[side].length || ""} {openPanel === "removals" ? "−" : "+"}</span>
                </button>
                <div id="duo-removal-options" hidden={openPanel !== "removals"}>
                  {openPanel === "removals" && <div className="flex flex-wrap gap-2 px-3 pb-3">
                    {removableIngredients.map((ingredient) => {
                      const removed = removedIngredientIds[side].includes(ingredient.id);
                      return <button key={ingredient.id} type="button" onClick={() => toggleRemovedIngredient(side, ingredient.id)} aria-pressed={removed} className={`min-h-10 rounded-full border px-3 text-xs font-bold ${removed ? "border-[#D99175] bg-[#3b2420] text-[#FFD0C1] line-through" : "border-[#5b4936] text-[#E7D8C5] hover:border-[#89623a]"}`}>{removed ? "Remettre" : "Retirer"} {ingredient.name}</button>;
                    })}
                  </div>}
                </div>
              </> : <p className="px-4 py-3 text-xs text-[#C7B498]">Retrait d’ingrédients indisponible pour cette recette.</p>}
            </section>
            <section className={optionPanelClass} aria-label="Suppléments de cette moitié">
              <button type="button" aria-expanded={openPanel === "supplements"} aria-controls="duo-supplement-options" onClick={() => togglePanel("supplements")} className={panelButtonClass}>
                <span>Ajouter des suppléments</span>
                <span aria-hidden="true" className="shrink-0 text-xs text-[#E8C078]">{currentHalfSupplementCount || ""} {openPanel === "supplements" ? "−" : "+"}</span>
              </button>
              <div id="duo-supplement-options" hidden={openPanel !== "supplements"}>
                {openPanel === "supplements" && <div className="space-y-2 px-3 pb-3">
                  <p className="text-xs text-[#C7B498]">Touchez un supplément pour choisir où l’ajouter.</p>
                  {renderSupplementOptions()}
                </div>}
              </div>
            </section>
          </div>
        </section> : page === "whole" ? <section aria-labelledby="duo-step">
          <h3 id="duo-step" ref={stepHeading} tabIndex={-1} className={headingClass}>Suppléments pizza entière</h3>
          <p className="mb-4 mt-2 text-sm text-[#C8BDAE]">Chaque supplément sélectionné ici s’ajoute aux deux moitiés.</p>
          {renderSupplementOptions()}
        </section> : <section aria-labelledby="duo-step">
          <h3 id="duo-step" ref={stepHeading} tabIndex={-1} className={headingClass}>Vérifiez votre pizza</h3>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-[#E7D8C5]">
            {(["left", "right"] as const).map((target) => {
              const recipe = target === "left" ? composition?.leftRecipe : composition?.rightRecipe;
              if (!recipe) return null;
              return <button key={target} type="button" onClick={() => edit(target)} className="min-w-0 rounded-xl border border-[#45362a] bg-[#191511] p-3 text-left hover:border-[#89623a]">
                <span className="block text-[10px] font-bold uppercase tracking-[.1em] text-[#D9AF6B]">{pizzaDuoSupplementTargetLabel(target)}</span>
                <span className="mt-1 block break-words font-semibold">{recipe.recipeName}</span>
                <span className="block text-xs text-[#C7B498]">Base {baseLabel(recipe.baseOverride ?? recipe.base).toLocaleLowerCase("fr")}</span>
                {!!recipe.removedIngredients?.length && <span className="mt-1 block text-xs text-[#DCCBB6]">sans {recipe.removedIngredients.map(({ ingredientName }) => ingredientName).join(", ")}</span>}
                <span className="mt-2 block text-xs font-semibold text-[#E8C078]">Modifier</span>
              </button>;
            })}
          </div>
          <div className="mt-3 rounded-xl border border-[#45362a] bg-[#191511] p-3">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <h4 className="text-sm font-bold text-[#F6EEE1]">Suppléments</h4>
              <button type="button" onClick={() => goTo({ page: "whole" })} className="min-h-10 text-xs font-bold text-[#E8C078] hover:underline">Suppléments pizza entière</button>
            </div>
            {composition?.supplements?.length ? <ul className="space-y-1 text-sm text-[#DCCBB6]">{composition.supplements.map((item) => <li key={`${item.ingredientId}-${item.target}`} className="flex justify-between gap-3"><span>{item.ingredientName} · {pizzaDuoSupplementTargetLabel(item.target)}</span><span className="shrink-0 text-[#E8C078]">+ {formatPrice(item.priceDeltaCents)} €</span></li>)}</ul> : <p className="text-sm text-[#C7B498]">Aucun supplément ajouté.</p>}
          </div>
          <div className="mt-4 flex items-center justify-between"><span className="text-sm font-semibold text-[#F6EEE1]">Quantité</span><div className="flex items-center gap-2"><button type="button" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="size-11 rounded-full bg-[#17130f] text-lg text-[#F6EEE1] disabled:opacity-40" aria-label="Retirer une Pizza Duo">−</button><span className="w-5 text-center font-bold text-[#F6EEE1]" aria-live="polite">{quantity}</span><button type="button" disabled={quantity >= 99 || !isQuantityAvailable(quantity + 1)} onClick={() => setQuantity((value) => value < 99 && isQuantityAvailable(value + 1) ? value + 1 : value)} className="size-11 rounded-full bg-[#E8C078] text-lg font-bold text-[#21150a] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Ajouter une Pizza Duo">+</button></div></div>
        </section>}
      </PizzaWorkshop>
    </div>
  );
}
