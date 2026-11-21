"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { formatPrice, type Product } from "@/types";
import type { CartItem, PizzaDuoComposition, PizzaDuoSupplementSelection, PizzaDuoSupplementTarget } from "@/types/cart";
import { PIZZA_DUO_FIXED_PRICE_CENTS, createPizzaDuoComposition, getPizzaDuoIngredientNames, isPizzaDuoRecipe } from "@/lib/pizza-duo";
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
type Base = string;
type Step = "recipes" | "supplements" | "review";

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
  const [side, setSide] = useState<Side>("left");
  const [filter, setFilter] = useState<Base>("all");
  const [quantity, setQuantity] = useState(initialQuantity);
  const [step, setStep] = useState<Step>(initial ? "review" : "recipes");
  const [supplementTarget, setSupplementTarget] = useState<PizzaDuoSupplementTarget>("whole");
  const [supplementSelections, setSupplementSelections] = useState<PizzaDuoSupplementSelection[]>(() =>
    normalizePizzaDuoSupplementSelections((initial?.supplements ?? []).map(({ ingredientId, target }) => ({ ingredientId, target }))),
  );
  const dialog = useRef<HTMLDivElement>(null);
  const summary = useRef<HTMLElement>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const confirmLock = useRef(false);
  const left = eligible.find((recipe) => recipe.id === leftId);
  const right = eligible.find((recipe) => recipe.id === rightId);
  const current = side === "left" ? left : right;
  const bases = useMemo<Base[]>(() => ["all", ...new Set(eligible.map((recipe) => normalizedBase(recipe.recipeBase)))], [eligible]);
  const activeFilter = bases.includes(filter) ? filter : "all";
  const visible = activeFilter === "all" ? eligible : eligible.filter((recipe) => normalizedBase(recipe.recipeBase) === activeFilter);
  const isEditing = Boolean(initial);
  const itemsOutsideEditedLine = useMemo(() => editingCartKey ? items.filter((item) => item.cartKey !== editingCartKey) : items, [editingCartKey, items]);
  const hasCompleteSelection = Boolean(left && right);
  // The helper validates eligibility against the current recipes. Draft choices
  // that became ineligible after a recipe revision are never displayed, priced
  // or serialized back into the cart.
  const validSupplementSelections = useMemo(() => left && right
    ? createPizzaDuoComposition(left, right, supplementSelections).supplements?.map(({ ingredientId, target }) => ({ ingredientId, target })) ?? []
    : normalizePizzaDuoSupplementSelections(supplementSelections), [left, right, supplementSelections]);
  const composition = useMemo(() => left && right ? createPizzaDuoComposition(left, right, validSupplementSelections) : undefined, [left, right, validSupplementSelections]);
  const unitPriceCents = composition ? getPizzaDuoUnitPriceCents(composition) : PIZZA_DUO_FIXED_PRICE_CENTS;
  const showSupplements = step === "supplements" && hasCompleteSelection;
  const showReview = step === "review" && hasCompleteSelection;
  const isQuantityAvailable = (nextQuantity: number) => {
    if (!left || !right) return false;
    const candidate: CartItem = {
      catalogItemId: product.id, catalogKind: "pizza_duo", quantity: nextQuantity,
      duo: composition ?? createPizzaDuoComposition(left, right), nameSnapshot: product.name,
      unitPriceCents, totalCents: unitPriceCents * nextQuantity,
      taxRateBps: product.tax_rate_bps, cartKey: "modal-candidate",
    };
    return isCartItemStockAvailable(itemsOutsideEditedLine, candidate, availability);
  };
  const stockAvailable = hasCompleteSelection && isQuantityAvailable(quantity);
  const canConfirm = stockAvailable && onlineOrdering.canStartOrder && Boolean(composition);
  const selectionRemoved = Boolean((leftId && !left) || (rightId && !right));
  const noRecipes = eligible.length === 0;

  useEffect(() => {
    const opener = document.activeElement;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = priorOverflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => { stepHeading.current?.focus({ preventScroll: true }); }, [side]);

  function edit(next: Side) {
    setStep("recipes");
    setSide(next);
    const recipe = next === "left" ? left : right;
    setFilter(recipe ? normalizedBase(recipe.recipeBase) : "all");
    requestAnimationFrame(() => {
      stepHeading.current?.focus({ preventScroll: true });
      stepHeading.current?.scrollIntoView({ block: "nearest" });
    });
  }
  function retainEligibleSupplements(nextLeft?: Product, nextRight?: Product) {
    if (!nextLeft || !nextRight) return;
    setSupplementSelections((previous) =>
      createPizzaDuoComposition(nextLeft, nextRight, previous).supplements?.map(({ ingredientId, target }) => ({ ingredientId, target })) ?? [],
    );
  }
  function choose(recipe: Product) {
    if (side === "left") {
      setLeftId(recipe.id);
      retainEligibleSupplements(recipe, right);
      // Do not carry a first-half base filter into the second step: mixed
      // tomato/cream pizzas must be immediately discoverable on mobile.
      setFilter("all");
      setSide("right");
      requestAnimationFrame(() => stepHeading.current?.scrollIntoView({ block: "nearest" }));
    }
    else {
      setRightId(recipe.id);
      retainEligibleSupplements(left, recipe);
      requestAnimationFrame(() => {
        dialog.current?.querySelector<HTMLButtonElement>('[data-testid="pizza-duo-next-supplements"]')?.focus({ preventScroll: true });
      });
    }
  }
  function continueToSupplements() {
    if (!canConfirm) return;
    setStep("supplements");
    requestAnimationFrame(() => stepHeading.current?.focus({ preventScroll: true }));
  }
  function review() {
    if (!canConfirm) return;
    setStep("review");
    requestAnimationFrame(() => summary.current?.focus());
  }
  function confirm() {
    if (confirmLock.current || !composition || !canConfirm) return;
    confirmLock.current = true;
    onConfirm(composition, quantity);
  }
  function toggleSupplement(ingredientId: string) {
    setSupplementSelections((previous) => {
      const ingredientSelections = previous.filter((item) => item.ingredientId === ingredientId);
      const rest = previous.filter((item) => item.ingredientId !== ingredientId);
      const selectedHere = ingredientSelections.some((item) => item.target === supplementTarget);
      if (selectedHere) return rest.concat(ingredientSelections.filter((item) => item.target !== supplementTarget));
      if (supplementTarget === "whole") {
        const next = normalizePizzaDuoSupplementSelections(rest.concat({ ingredientId, target: "whole" }));
        return next.length <= 40 ? next : previous;
      }
      if (ingredientSelections.some((item) => item.target === "whole")) {
        return normalizePizzaDuoSupplementSelections(rest.concat({
          ingredientId,
          target: supplementTarget === "left" ? "right" : "left",
        }));
      }
      const halfSelections = ingredientSelections;
      const next = normalizePizzaDuoSupplementSelections(rest.concat(halfSelections, { ingredientId, target: supplementTarget }));
      return next.length <= 40 ? next : previous;
    });
  }
  const previewTitle = left && right ? `${left.name} × ${right.name}` : product.name;
  const warning = !onlineOrdering.canStartOrder
    ? (onlineOrdering.message ?? "Les commandes en ligne sont indisponibles.")
    : !stockAvailable && hasCompleteSelection
      ? "Stock insuffisant pour cette composition ou cette quantité."
      : undefined;
  const supplementOptions = left && right ? getPizzaDuoSupplementOptions(left, right, supplementTarget) : [];
  const selectedSupplementIds = new Set((composition?.supplements ?? [])
    .filter(({ target }) => target === supplementTarget || target === "whole")
    .map(({ ingredientId }) => ingredientId));
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
        preview={<PizzaDuoVisual left={left} right={right} />}
        previewTitle={previewTitle}
        previewDetails={<><span className="block">{left ? `Moitié 1 · Base ${baseLabel(left.recipeBase)}` : "Choisissez votre première moitié"}</span><span className="block">{right ? `Moitié 2 · Base ${baseLabel(right.recipeBase)}` : "Choisissez votre deuxième moitié"}</span></>}
        unitPriceCents={unitPriceCents}
        totalCents={unitPriceCents * quantity}
        steps={["Recettes", "Personnaliser", "Vérifier"]}
        activeStep={showReview ? 2 : showSupplements ? 1 : 0}
        onClose={onClose}
        returnLabel={isEditing ? "Retour au panier" : "Retour à la carte"}
        onBack={showReview ? () => setStep("supplements") : showSupplements ? () => setStep("recipes") : undefined}
        actionLabel={showReview ? (isEditing ? "Enregistrer les modifications" : "Ajouter au panier") : showSupplements ? "Vérifier ma pizza" : "Personnaliser ma pizza"}
        actionDisabled={!canConfirm}
        actionTestId={showReview ? "pizza-duo-confirm" : showSupplements ? "pizza-duo-review" : "pizza-duo-next-supplements"}
        onAction={showReview ? confirm : showSupplements ? review : continueToSupplements}
        warning={warning}
      >
        {step === "recipes" ? <section aria-labelledby="duo-step">
          <h3 id="duo-step" ref={stepHeading} tabIndex={-1} className="text-[clamp(1.7rem,3vw,2.4rem)] font-extrabold leading-tight tracking-[-.045em] text-[#FFF5E1] outline-none">Deux envies. Une pizza.</h3>
          <p className="mt-2 text-sm leading-relaxed text-[#C8BDAE]">Choisissez une recette pour chaque moitié. Vous pouvez mélanger les bases ou choisir deux fois la même recette.</p>
          <p className="mt-2 text-xs font-medium text-[#D9C6A9]">Les suppléments seront proposés à l’étape suivante selon les recettes choisies.</p>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3" aria-label="Choix des moitiés">
            {(["left", "right"] as const).map((item, index) => {
              const recipe = item === "left" ? left : right;
              return <button key={item} type="button" onClick={() => edit(item)} aria-current={side === item ? "step" : undefined} className={`flex min-w-0 items-center gap-2 rounded-[16px] border p-2 text-left transition-colors sm:gap-3 sm:p-3 ${side === item ? "border-[#D6A657] bg-[#302517] shadow-[0_0_0_3px_rgba(214,166,87,.1)]" : "border-[#4c3a29] bg-[#211a14] hover:border-[#89623a]"}`}>
                {recipe ? <Image src={recipe.image} alt="" width={48} height={48} className="size-10 shrink-0 rounded-[10px] object-cover sm:size-12" /> : <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-[#342719] text-[#E8C078] sm:size-12">{index + 1}</span>}
                <span className="min-w-0 flex-1"><span className="block text-[9px] font-extrabold uppercase tracking-[.1em] text-[#D9AF6B]">Moitié {index + 1}</span><span className="block truncate text-xs font-bold text-[#F6EEE1] sm:text-sm">{recipe?.name ?? "À choisir"}</span>{recipe && <span className="block truncate text-[10px] text-[#C7B498]">Base {baseLabel(recipe.recipeBase)}</span>}</span>
                <span aria-hidden="true" className="text-[#D9AF6B]">›</span>
              </button>;
            })}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <h4 className="text-sm font-bold text-[#F6EEE1]">{side === "left" ? "Choisir la moitié 1" : "Choisir la moitié 2"}</h4>
            <span className="text-[11px] text-[#D4C0A1]">Inclus dans le prix Duo</span>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrer par base">
            {bases.map((base) => <button key={base} type="button" onClick={() => setFilter(base)} aria-pressed={activeFilter === base} className={`min-h-10 shrink-0 rounded-full px-3 text-xs font-bold ${activeFilter === base ? "bg-[#E8C078] text-[#21150a]" : "border border-[#4c3b2c] bg-[#211a14] text-[#E4D5C1]"}`}>{base === "all" ? "Toutes" : baseLabel(base)}</button>)}
          </div>
          {selectionRemoved && <p role="status" className="mt-3 rounded-xl bg-[#392825] px-3 py-2 text-sm text-[#FFC3B9]">Une recette sélectionnée n’est plus disponible. Choisissez-en une autre.</p>}
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {visible.map((recipe) => {
              const selected = current?.id === recipe.id;
              return <button key={recipe.id} data-duo-recipe={recipe.id} type="button" onClick={() => choose(recipe)} aria-pressed={selected} className={`group flex min-h-[72px] min-w-0 items-center gap-3 rounded-[15px] border p-2.5 text-left transition-colors ${selected ? "border-[#D7A95C] bg-[#352817] shadow-[inset_0_0_0_1px_rgba(232,192,120,.18)]" : "border-[#46382b] bg-[#211a14] hover:border-[#8b663d]"}`}>
                <Image src={recipe.image} alt="" width={56} height={56} sizes="56px" className="size-14 shrink-0 rounded-[11px] object-cover" />
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-[#F6EEE1]">{recipe.name}</span><span className="mt-0.5 block text-[11px] text-[#E4BB78]">Base {baseLabel(recipe.recipeBase)}</span><span className="mt-1 block truncate text-[10px] text-[#C7BBAA]">{getPizzaDuoIngredientNames(recipe).join(", ")}</span></span>
                <span aria-hidden="true" className={`grid size-5 shrink-0 place-items-center rounded-full border text-[11px] ${selected ? "border-[#E8C078] bg-[#E8C078] text-[#21150a]" : "border-[#806646] text-transparent"}`}>✓</span>
              </button>;
            })}
          </div>
          {noRecipes && <p className="mt-3 text-sm text-[#F4B6A2]">Aucune recette disponible pour une Pizza Duo.</p>}

        </section> : showSupplements ? <section aria-labelledby="duo-supplements-step">
            <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#E8C078]">02 / Personnaliser</p>
            <h3 id="duo-supplements-step" ref={stepHeading} tabIndex={-1} className="mt-2 text-[clamp(1.7rem,3vw,2.4rem)] font-extrabold leading-tight tracking-[-.045em] text-[#FFF5E1] outline-none">Vos suppléments</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#C8BDAE]">Choisissez où ajouter chaque supplément. Sur une moitié, son prix est divisé par deux et arrondi au centime.</p>
            <div className="mt-5 grid grid-cols-3 gap-2" role="group" aria-label="Appliquer les suppléments à">
              {(["whole", "left", "right"] as const).map((target) => <button key={target} type="button" onClick={() => setSupplementTarget(target)} aria-pressed={supplementTarget === target} className={`min-h-12 rounded-xl border px-2 text-xs font-bold ${supplementTarget === target ? "border-[#E8C078] bg-[#352817] text-[#F7DCA9]" : "border-[#4b3b2d] bg-[#211a14] text-[#D8C8B4]"}`}>{pizzaDuoSupplementTargetLabel(target)}</button>)}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3"><h4 className="text-sm font-bold text-[#F6EEE1]">Disponibles pour {pizzaDuoSupplementTargetLabel(supplementTarget).toLowerCase()}</h4><span className="text-[11px] text-[#C7B498]">{supplementOptions.length} choix</span></div>
            {supplementOptions.length ? <div className="mt-3">
              <SupplementPicker
                key={supplementTarget}
                ingredients={supplementOptions}
                itemsClassName="grid grid-cols-1 gap-2 sm:grid-cols-2"
                renderIngredient={(ingredient) => {
                const priceDeltaCents = getPizzaDuoSupplementPriceCents(ingredient.defaultPriceModifier.amountCents, supplementTarget);
                const selected = selectedSupplementIds.has(ingredient.id);
                return <button key={ingredient.id} type="button" onClick={() => toggleSupplement(ingredient.id)} aria-pressed={selected} className={`flex min-h-[64px] items-center gap-3 rounded-[15px] border p-3 text-left ${selected ? "border-[#E8C078] bg-[#352817]" : "border-[#493a2c] bg-[#211a14] hover:border-[#89623a]"}`}>
                  <span className={`grid size-6 shrink-0 place-items-center rounded-full border text-xs ${selected ? "border-[#E8C078] bg-[#E8C078] text-[#21150a]" : "border-[#806646] text-transparent"}`}>✓</span>
                  <span className="min-w-0 flex-1"><span className="block break-words text-sm font-bold text-[#F6EEE1]">{ingredient.name}</span><span className="block text-xs text-[#C7B498]">+ {formatPrice(priceDeltaCents)} € · {pizzaDuoSupplementTargetLabel(supplementTarget)}</span></span>
                </button>;
                }}
              />
            </div> : <div className="mt-3 rounded-[16px] border border-dashed border-[#5b4936] bg-[#211a14] p-4 text-sm leading-relaxed text-[#C8BDAE]">{supplementTarget === "whole" ? "Aucun supplément commun aux deux recettes. Sélectionnez une moitié pour voir les choix disponibles." : "Aucun supplément disponible pour cette moitié."}</div>}
            {composition?.supplements?.length ? <details open={composition.supplements.length <= 4} className="mt-5 rounded-[16px] border border-[#5b4630] bg-[#211a14] p-4"><summary className="cursor-pointer text-sm font-bold text-[#F6EEE1]">Sélection actuelle ({composition.supplements.length})</summary><ul className="mt-2 space-y-1.5 text-sm text-[#DCCBB6]">{composition.supplements.map((item) => <li key={`${item.ingredientId}-${item.target}`} className="flex justify-between gap-3"><span>{item.ingredientName} · {pizzaDuoSupplementTargetLabel(item.target)}</span><span className="shrink-0 text-[#E8C078]">+ {formatPrice(item.priceDeltaCents)} €</span></li>)}</ul></details> : null}
          </section> : <section ref={summary} tabIndex={-1} className="outline-none" aria-label="Résumé de votre Pizza Duo">
            <h3 className="text-[clamp(1.7rem,3vw,2.4rem)] font-extrabold leading-tight tracking-[-.045em] text-[#FFF5E1]">Vérifiez votre pizza</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-[#E7D8C5]">
              <button type="button" onClick={() => edit("left")} className="rounded-xl border border-[#45362a] bg-[#191511] p-3 text-left hover:border-[#89623a]"><span className="block text-[10px] font-bold uppercase tracking-[.1em] text-[#D9AF6B]">Moitié 1</span><span className="mt-1 block truncate font-semibold">{left?.name}</span><span className="text-xs text-[#C7B498]">Base {baseLabel(left?.recipeBase)}</span></button>
              <button type="button" onClick={() => edit("right")} className="rounded-xl border border-[#45362a] bg-[#191511] p-3 text-left hover:border-[#89623a]"><span className="block text-[10px] font-bold uppercase tracking-[.1em] text-[#D9AF6B]">Moitié 2</span><span className="mt-1 block truncate font-semibold">{right?.name}</span><span className="text-xs text-[#C7B498]">Base {baseLabel(right?.recipeBase)}</span></button>
            </div>
            <div className="mt-4 rounded-xl border border-[#45362a] bg-[#191511] p-3"><div className="flex items-center justify-between gap-3"><h4 className="text-sm font-bold text-[#F6EEE1]">Suppléments</h4><button type="button" onClick={() => setStep("supplements")} className="text-xs font-bold text-[#E8C078] hover:underline">Modifier</button></div>{composition?.supplements?.length ? <ul className="mt-2 space-y-1 text-sm text-[#DCCBB6]">{composition.supplements.map((item) => <li key={`${item.ingredientId}-${item.target}`} className="flex justify-between gap-3"><span>{item.ingredientName} · {pizzaDuoSupplementTargetLabel(item.target)}</span><span className="shrink-0 text-[#E8C078]">+ {formatPrice(item.priceDeltaCents)} €</span></li>)}</ul> : <p className="mt-1 text-sm text-[#C7B498]">Aucun supplément ajouté.</p>}</div>
            <div className="mt-4 flex items-center justify-between"><span className="text-sm font-semibold text-[#F6EEE1]">Quantité</span><div className="flex items-center gap-2"><button type="button" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="size-11 rounded-full bg-[#17130f] text-lg text-[#F6EEE1] disabled:opacity-40" aria-label="Retirer une Pizza Duo">−</button><span className="w-5 text-center font-bold text-[#F6EEE1]" aria-live="polite">{quantity}</span><button type="button" disabled={quantity >= 99 || !isQuantityAvailable(quantity + 1)} onClick={() => setQuantity((value) => value < 99 && isQuantityAvailable(value + 1) ? value + 1 : value)} className="size-11 rounded-full bg-[#E8C078] text-lg font-bold text-[#21150a] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Ajouter une Pizza Duo">+</button></div></div>
          </section>}
      </PizzaWorkshop>
    </div>
  );
}
