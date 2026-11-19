"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@/types";
import type { CartItem, PizzaDuoComposition } from "@/types/cart";
import { formatPrice } from "@/types";
import { PIZZA_DUO_FIXED_PRICE_CENTS, createPizzaDuoComposition, getPizzaDuoIngredientNames, isPizzaDuoRecipe } from "@/lib/pizza-duo";
import { useCart } from "@/contexts/CartContext";
import { useCatalogAvailability } from "@/contexts/CatalogAvailabilityContext";
import { isCartItemStockAvailable } from "@/lib/product-availability";
import { useOnlineOrderingStatus } from "@/contexts/OnlineOrderingStatusContext";

interface Props {
  product: Product; recipes: Product[]; initial?: PizzaDuoComposition;
  initialQuantity?: number; editingCartKey?: string; onClose: () => void;
  onConfirm: (composition: PizzaDuoComposition, quantity: number) => void;
}
type Side = "left" | "right";
type Base = string;

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
  const dialog = useRef<HTMLDivElement>(null);
  const summary = useRef<HTMLElement>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const left = eligible.find((recipe) => recipe.id === leftId);
  const right = eligible.find((recipe) => recipe.id === rightId);
  const current = side === "left" ? left : right;
  const bases = useMemo<Base[]>(() => ["all", ...new Set(eligible.map((recipe) => normalizedBase(recipe.recipeBase)))], [eligible]);
  const activeFilter = bases.includes(filter) ? filter : "all";
  const visible = activeFilter === "all" ? eligible : eligible.filter((recipe) => normalizedBase(recipe.recipeBase) === activeFilter);
  const isEditing = Boolean(initial);
  const itemsOutsideEditedLine = useMemo(() => editingCartKey ? items.filter((item) => item.cartKey !== editingCartKey) : items, [editingCartKey, items]);
  const hasCompleteSelection = Boolean(left && right);
  const isQuantityAvailable = (nextQuantity: number) => {
    if (!left || !right) return false;
    const candidate: CartItem = {
      catalogItemId: product.id, catalogKind: "pizza_duo", quantity: nextQuantity,
      duo: createPizzaDuoComposition(left, right), nameSnapshot: product.name,
      unitPriceCents: PIZZA_DUO_FIXED_PRICE_CENTS, totalCents: PIZZA_DUO_FIXED_PRICE_CENTS * nextQuantity,
      taxRateBps: product.tax_rate_bps, cartKey: "modal-candidate",
    };
    return isCartItemStockAvailable(itemsOutsideEditedLine, candidate, availability);
  };
  const stockAvailable = hasCompleteSelection && isQuantityAvailable(quantity);
  const canConfirm = stockAvailable && onlineOrdering.canStartOrder;
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
    setSide(next);
    const recipe = next === "left" ? left : right;
    setFilter(recipe ? normalizedBase(recipe.recipeBase) : "all");
    requestAnimationFrame(() => {
      stepHeading.current?.focus({ preventScroll: true });
      stepHeading.current?.scrollIntoView({ block: "nearest" });
    });
  }
  function choose(recipe: Product) {
    if (side === "left") {
      setLeftId(recipe.id);
      // Do not carry a first-half base filter into the second step: mixed
      // tomato/cream pizzas must be immediately discoverable on mobile.
      setFilter("all");
      setSide("right");
      requestAnimationFrame(() => stepHeading.current?.scrollIntoView({ block: "nearest" }));
    }
    else {
      setRightId(recipe.id);
      requestAnimationFrame(() => {
        summary.current?.focus({ preventScroll: true });
        summary.current?.scrollIntoView({ block: "nearest" });
      });
    }
  }
  return (
    <div ref={dialog} className="fixed inset-0 z-[9991] flex items-end justify-center bg-black/70 backdrop-blur-sm md:items-center" role="dialog" aria-modal="true" aria-labelledby="pizza-duo-title"
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.stopPropagation(); onClose(); return; }
        if (event.key !== "Tab") return;
        const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
        if (!buttons?.length) return;
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}>
      <div className="flex max-h-[94dvh] w-full max-w-[720px] flex-col overflow-hidden rounded-t-[24px] bg-[#1A1A1A] md:rounded-[22px]">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 id="pizza-duo-title" className="text-[20px] font-bold text-[#F5F5F5]">{product.name}</h2>
            <p className="text-[14px] text-[#D4A053]">{formatPrice(PIZZA_DUO_FIXED_PRICE_CENTS)} € la pizza</p>
          </div>
          <button type="button" onClick={onClose} className="size-11 shrink-0 rounded-full bg-[#252525] text-xl text-[#F5F5F5]" aria-label="Fermer le configurateur">×</button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <p className="mb-4 text-[13px] text-[#CFCFCF]">Choisissez une recette par moitié. Vous pouvez mélanger les bases ou choisir deux fois la même recette.</p>
          <div className="mb-4 grid grid-cols-2 gap-2" aria-label="Étapes de composition">
            {(["left", "right"] as const).map((item, index) => {
              const recipe = item === "left" ? left : right;
              return <button key={item} type="button" onClick={() => edit(item)} aria-current={side === item ? "step" : undefined} className={`rounded-[14px] border px-3 py-3 text-left ${side === item ? "border-[#D4A053] bg-[#D4A053]/15" : "border-white/10 bg-[#252525]"}`}>
                <span className="block text-[11px] font-bold uppercase text-[#D4A053]">Étape {index + 1}</span>
                <span className="block text-[14px] font-semibold text-[#F5F5F5]">{recipe?.name ?? `Choisir ma ${index === 0 ? "première" : "deuxième"} moitié`}</span>
                {recipe && <span className="block text-[12px] text-[#A0A0A0]">Base {baseLabel(recipe.recipeBase)} · Modifier</span>}
              </button>;
            })}
          </div>
          <section aria-labelledby="duo-step">
            <h3 id="duo-step" ref={stepHeading} tabIndex={-1} className="mb-3 text-[17px] font-bold text-[#F5F5F5]">{side === "left" ? "Choisir ma première moitié" : "Choisir ma deuxième moitié"}</h3>
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrer par base">
              {bases.map((base) => <button key={base} type="button" onClick={() => setFilter(base)} aria-pressed={activeFilter === base} className={`min-h-11 shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold ${activeFilter === base ? "bg-[#D4A053] text-[#0D0D0D]" : "bg-[#252525] text-[#F5F5F5]"}`}>{base === "all" ? "Toutes" : baseLabel(base)}</button>)}
            </div>
            {selectionRemoved && <p role="status" className="mb-3 rounded-lg bg-[#392825] px-3 py-2 text-sm text-[#FFC3B9]">Une recette sélectionnée n’est plus disponible. Choisissez-en une autre.</p>}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {visible.map((recipe) => <button key={recipe.id} type="button" onClick={() => choose(recipe)} aria-pressed={current?.id === recipe.id} className={`rounded-[14px] border px-3 py-3 text-left ${current?.id === recipe.id ? "border-[#D4A053] bg-[#D4A053]/15" : "border-white/10 bg-[#252525]"}`}>
                <span className="block text-[14px] font-semibold text-[#F5F5F5]">{recipe.name}</span>
                <span className="block text-[12px] text-[#A0A0A0]">Base {baseLabel(recipe.recipeBase)}</span>
                <span className="mt-1 block text-[12px] text-[#CFCFCF]">{getPizzaDuoIngredientNames(recipe).join(", ")}</span>
              </button>)}
            </div>
            {noRecipes && <p className="mt-3 text-[13px] text-[#E8A0A0]">Aucune recette disponible pour une Pizza Duo.</p>}
          </section>
          {hasCompleteSelection && <section ref={summary} tabIndex={-1} className="mt-5 rounded-[14px] border border-white/10 bg-[#252525] p-4 outline-none" aria-label="Résumé de votre Pizza Duo">
            <h3 className="text-[15px] font-bold text-[#F5F5F5]">Votre Pizza Duo</h3>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[13px] text-[#CFCFCF]">
              <button type="button" onClick={() => edit("left")} className="rounded-lg bg-[#1A1A1A] p-2 text-left"><span className="block text-[#D4A053]">Moitié 1</span>{left?.name}</button>
              <button type="button" onClick={() => edit("right")} className="rounded-lg bg-[#1A1A1A] p-2 text-left"><span className="block text-[#D4A053]">Moitié 2</span>{right?.name}</button>
            </div>
            <div className="mt-3 flex items-center justify-between"><span className="text-[14px] text-[#F5F5F5]">Quantité</span><div className="flex items-center gap-2">
              <button type="button" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="size-11 rounded-full bg-[#1A1A1A] text-[#F5F5F5] disabled:opacity-50" aria-label="Retirer une Pizza Duo">−</button>
              <span className="w-5 text-center text-[#F5F5F5]" aria-live="polite">{quantity}</span>
              <button type="button" disabled={quantity >= 99 || !isQuantityAvailable(quantity + 1)} onClick={() => setQuantity((value) => value < 99 && isQuantityAvailable(value + 1) ? value + 1 : value)} className="size-11 rounded-full bg-[#D4A053] text-[#0D0D0D] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Ajouter une Pizza Duo">+</button>
            </div></div>
            {!stockAvailable && <p className="mt-2 text-[13px] text-[#E8A0A0]">Stock insuffisant pour cette composition ou cette quantité.</p>}
          </section>}
        </div>
        <footer className="border-t border-white/10 p-5">{!onlineOrdering.canStartOrder && <p className="mb-2 text-center text-[13px] text-[#E8A0A0]">{onlineOrdering.message ?? "Les commandes en ligne sont indisponibles."}</p>}<button type="button" disabled={!canConfirm} onClick={() => left && right && canConfirm && onConfirm(createPizzaDuoComposition(left, right), quantity)} className="w-full rounded-[18px] bg-[#D4A053] py-4 text-[16px] font-bold text-[#0D0D0D] disabled:cursor-not-allowed disabled:opacity-50">{isEditing ? "Enregistrer les modifications" : "Ajouter au panier"} · {formatPrice(PIZZA_DUO_FIXED_PRICE_CENTS * quantity)} €</button></footer>
      </div>
    </div>
  );
}
