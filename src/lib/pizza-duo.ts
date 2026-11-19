import type { Product } from "@/types";
import type { PizzaDuoComposition, PizzaDuoRecipeSnapshot } from "@/types/cart";

export const PIZZA_DUO_FIXED_PRICE_CENTS = 1490;
export const PIZZA_DUO_TENANT_ID = "d_lizza";

/**
 * The feature is intentionally local-only until every operational reader has
 * been deployed and validated. A production build can never expose the entry
 * point merely through a runtime catalogue change.
 */
export function isPizzaDuoDevelopmentEnabled(): boolean {
  if (process.env.NODE_ENV === "production" ||
      process.env.NEXT_PUBLIC_ENABLE_PIZZA_DUO !== "true" ||
      process.env.NEXT_PUBLIC_PIZZA_DUO_LOCAL_EMULATOR !== "true" ||
      (process.env.NEXT_PUBLIC_WL_APP_ID ?? process.env.WL_APP_ID ?? PIZZA_DUO_TENANT_ID) !== PIZZA_DUO_TENANT_ID) {
    return false;
  }
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

export function isPizzaDuoProduct(product: Product): boolean {
  return product.kind === "pizza_duo";
}

/** A malformed composite remains a Duo for display/filtering purposes, but is never sellable. */
export function isValidPizzaDuoProduct(product: Product): boolean {
  return isPizzaDuoProduct(product) &&
    product.price_cents === PIZZA_DUO_FIXED_PRICE_CENTS &&
    product.pizzaUnits === 1;
}

export function isPizzaDuoRecipeCandidate(product: Product): boolean {
  return product.category === "pizzas" &&
    product.kind !== "pizza_duo" &&
    product.pizzaUnits === 1 &&
    !!product.recipeBase &&
    product.active &&
    Number.isSafeInteger(product.price_cents) && product.price_cents > 0 &&
    product.baseIngredientIds.every(id => product.ingredientLibrary?.some(ingredient => ingredient.id === id && ingredient.name.trim())) &&
    (product.ingredients.length > 0 || product.baseIngredientIds.length > 0);
}

export function isPizzaDuoRecipe(product: Product): boolean {
  return isPizzaDuoRecipeCandidate(product) && product.manualOutOfStock !== true &&
    (!product.stockManaged || (typeof product.stockQty === "number" && Number.isSafeInteger(product.stockQty) && product.stockQty > 0));
}

function snapshotRecipe(product: Product): PizzaDuoRecipeSnapshot {
  return {
    recipeId: product.id,
    recipeName: product.name,
    base: product.recipeBase === "creme" ? "creme" : "tomate",
    description: product.description_short || undefined,
    ingredients: getPizzaDuoIngredientNames(product),
  };
}

/** Match the server snapshot when library references and editorial labels coexist. */
export function getPizzaDuoIngredientNames(product: Product): string[] {
  const byId = new Map((product.ingredientLibrary ?? []).map(ingredient => [ingredient.id, ingredient.name.trim()]));
  const names = [...new Set(product.baseIngredientIds)].flatMap(id => byId.get(id) || []);
  const seen = new Set(names.map(label => label.toLocaleLowerCase("fr")));
  for (const ingredient of product.ingredients) {
    const label = ingredient.trim();
    const key = label.toLocaleLowerCase("fr");
    if (label && !seen.has(key)) {
      seen.add(key);
      names.push(label);
    }
  }
  return names;
}

export function createPizzaDuoComposition(leftRecipe: Product, rightRecipe: Product): PizzaDuoComposition {
  return {
    kind: "pizza_duo",
    leftRecipeId: leftRecipe.id,
    rightRecipeId: rightRecipe.id,
    leftRecipe: snapshotRecipe(leftRecipe),
    rightRecipe: snapshotRecipe(rightRecipe),
  };
}

export function pizzaDuoCartKey(productId: string, duo: PizzaDuoComposition): string {
  // Left/right ordering is intentionally preserved for kitchen readability.
  return `${productId}__duo:${JSON.stringify([duo.leftRecipeId, duo.rightRecipeId])}`;
}
