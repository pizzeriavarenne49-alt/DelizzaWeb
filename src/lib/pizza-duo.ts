import type { Product, ProductIngredient } from "@/types";
import type {
  PizzaDuoComposition, PizzaDuoOrderSelection, PizzaDuoRecipeSnapshot,
  PizzaDuoSupplementSelection, PizzaDuoSupplementTarget,
} from "@/types/cart";

export const PIZZA_DUO_FIXED_PRICE_CENTS = 1490;
export const PIZZA_DUO_TENANT_ID = "d_lizza";
export const PIZZA_DUO_CATALOG_ID = "d_lizza_pizza_duo_comptoir";
export const PIZZA_DUO_CATEGORY_ID = "d_lizza_pizza_duo";
const DELIZZA_BASE_CATEGORIES: Readonly<Record<string, "tomate" | "creme">> = {
  "3LPzBegYvk8oA8rSVjkc": "tomate",
  "PxEZOWgUxAHxedwWHOSp": "creme",
};

export function isDelizzaPizzaCategory(categoryId: string): boolean {
  return categoryId === "pizzas" || Object.hasOwn(DELIZZA_BASE_CATEGORIES, categoryId);
}

/** Production recipes may store their base only via the category, as in Firestore. */
export function getPizzaDuoRecipeBase(categoryId: string, explicitBase: unknown): "tomate" | "creme" | undefined {
  if (!isDelizzaPizzaCategory(categoryId)) return undefined;
  const base = typeof explicitBase === "string" ? explicitBase.trim().toLowerCase() : "";
  if (base === "tomate") return "tomate";
  if (base === "creme" || base === "crème") return "creme";
  if (base === "" && Object.hasOwn(DELIZZA_BASE_CATEGORIES, categoryId)) {
    return DELIZZA_BASE_CATEGORIES[categoryId];
  }
  return undefined;
}


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
  return isDelizzaPizzaCategory(product.category) &&
    product.kind !== "pizza_duo" &&
    product.pizzaUnits === 1 &&
    !!getPizzaDuoRecipeBase(product.category, product.recipeBase) &&
    product.active &&
    Number.isSafeInteger(product.price_cents) && product.price_cents > 0 &&
    product.baseIngredientIds.every(id => product.ingredientLibrary?.some(ingredient => ingredient.id === id && ingredient.name.trim())) &&
    (product.ingredients.length > 0 || product.baseIngredientIds.length > 0);
}

export function isPizzaDuoRecipe(product: Product): boolean {
  return isPizzaDuoRecipeCandidate(product) && product.manualOutOfStock !== true &&
    (!product.stockManaged || (typeof product.stockQty === "number" && Number.isSafeInteger(product.stockQty) && product.stockQty > 0));
}

export function getPizzaDuoCoverRecipes(recipes: readonly Product[]): [Product, Product] | undefined {
  const pictured = recipes.filter((recipe) => isPizzaDuoRecipe(recipe) &&
    recipe.image.trim() && !/(?:\/|%2f)placeholder\.[a-z]+(?:[?#]|$)/i.test(recipe.image));
  const base = (recipe: Product) => getPizzaDuoRecipeBase(recipe.category, recipe.recipeBase);
  const left = pictured.find((recipe) => recipe.slug === "chorizo") ??
    pictured.find((recipe) => base(recipe) === "tomate") ?? pictured[0];
  if (!left) return undefined;

  const alternatives = pictured.filter((recipe) => recipe.id !== left.id && recipe.image !== left.image);
  const right = alternatives.find((recipe) => recipe.slug === "imperiale") ??
    alternatives.find((recipe) => base(recipe) !== base(left)) ?? alternatives[0];
  return right ? [left, right] : undefined;
}

function snapshotRecipe(
  product: Product,
  removedIngredientIds: readonly string[] = [],
  baseOverride?: "tomate" | "crème",
): PizzaDuoRecipeSnapshot {
  const baseIngredients = getPizzaDuoBaseIngredients(product);
  const removedIds = new Set(product.allowIngredientRemoval ? removedIngredientIds : []);
  const removedIngredients = baseIngredients
    .filter((ingredient) => removedIds.has(ingredient.id))
    .map((ingredient) => ({ ingredientId: ingredient.id, ingredientName: ingredient.name }));
  return {
    recipeId: product.id,
    recipeName: product.name,
    base: getPizzaDuoRecipeBase(product.category, product.recipeBase) ?? "tomate",
    ...(baseOverride ? { baseOverride } : {}),
    description: product.description_short || undefined,
    ingredients: getPizzaDuoIngredientNames(product),
    ...(removedIngredients.length ? { removedIngredients } : {}),
  };
}

export function getPizzaDuoBaseIngredients(product: Product): ProductIngredient[] {
  const baseIds = new Set(product.baseIngredientIds);
  return (product.ingredientLibrary ?? []).filter((ingredient) => baseIds.has(ingredient.id) && ingredient.name.trim());
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

function validSupplements(product?: Product): ProductIngredient[] {
  if (!product) return [];
  return (product.ingredientLibrary ?? []).filter((ingredient) =>
    ingredient.appId === PIZZA_DUO_TENANT_ID && ingredient.isActive &&
    ingredient.name.trim() && ingredient.defaultPriceModifier.currency.toUpperCase() === "EUR" &&
    Number.isSafeInteger(ingredient.defaultPriceModifier.amountCents) &&
    ingredient.defaultPriceModifier.amountCents >= 0 &&
    product.availableSupplementIds?.includes(ingredient.id));
}

function duoPolicySupplements(duoProduct: Product, ids: readonly string[]): ProductIngredient[] {
  const allowedIds = new Set(ids);
  return (duoProduct.ingredientLibrary ?? []).filter((ingredient) =>
    ingredient.appId === PIZZA_DUO_TENANT_ID && ingredient.isActive &&
    ingredient.name.trim() && ingredient.defaultPriceModifier.currency.toUpperCase() === "EUR" &&
    Number.isSafeInteger(ingredient.defaultPriceModifier.amountCents) &&
    ingredient.defaultPriceModifier.amountCents >= 0 && allowedIds.has(ingredient.id));
}

/**
 * A saved Duo policy belongs to the parent product and applies to either half
 * and the whole pizza. Older parents have no field and retain the recipe
 * policy, preserving existing carts and catalogue entries. A shared policy
 * can already quote a whole-pizza extra while the second recipe is unselected.
 */
export function getPizzaDuoSupplementOptions(
  left: Product | undefined,
  right: Product | undefined,
  target: PizzaDuoSupplementTarget,
  duoProduct?: Product,
): ProductIngredient[] {
  if (!left && !right) return [];
  if (duoProduct?.pizzaDuoSupplementIds !== undefined) return duoPolicySupplements(duoProduct, duoProduct.pizzaDuoSupplementIds);
  if (duoProduct?.pizzaCommonSupplementIds !== undefined) return duoPolicySupplements(duoProduct, duoProduct.pizzaCommonSupplementIds);
  if (target === "left") return validSupplements(left);
  if (target === "right") return validSupplements(right);
  const rightIds = new Set(validSupplements(right).map(({ id }) => id));
  return validSupplements(left).filter(({ id }) => rightIds.has(id));
}

export function getPizzaDuoSupplementPriceCents(cataloguePriceCents: number, target: PizzaDuoSupplementTarget): number {
  return target === "whole" ? cataloguePriceCents : Math.round(cataloguePriceCents / 2);
}

export function isPizzaDuoSupplementTarget(value: unknown): value is PizzaDuoSupplementTarget {
  return value === "whole" || value === "left" || value === "right";
}

export function pizzaDuoSupplementTargetLabel(target: PizzaDuoSupplementTarget): string {
  if (target === "left") return "Moitié 1";
  if (target === "right") return "Moitié 2";
  return "Pizza entière";
}

export function normalizePizzaDuoSupplementSelections(selections: readonly PizzaDuoSupplementSelection[]): PizzaDuoSupplementSelection[] {
  const targetsByIngredient = new Map<string, Set<PizzaDuoSupplementTarget>>();
  for (const { ingredientId, target } of selections) {
    if (typeof ingredientId !== "string" || !ingredientId || !isPizzaDuoSupplementTarget(target)) continue;
    const targets = targetsByIngredient.get(ingredientId) ?? new Set<PizzaDuoSupplementTarget>();
    targets.add(target);
    targetsByIngredient.set(ingredientId, targets);
  }
  return [...targetsByIngredient.keys()].sort().map((ingredientId) => {
    const targets = targetsByIngredient.get(ingredientId)!;
    // Covering both halves is one whole-pizza supplement, also for odd prices.
    const target = targets.has("whole") || targets.size === 2 ? "whole" : targets.has("left") ? "left" : "right";
    return { ingredientId, target };
  });
}

export function createPizzaDuoComposition(
  leftRecipe: Product,
  rightRecipe: Product,
  selections: readonly PizzaDuoSupplementSelection[] = [],
  duoProduct?: Product,
  removedIngredients: { left: readonly string[]; right: readonly string[] } = { left: [], right: [] },
  baseOverrides: { left?: "tomate" | "crème"; right?: "tomate" | "crème" } = {},
): PizzaDuoComposition {
  const options = {
    left: getPizzaDuoSupplementOptions(leftRecipe, rightRecipe, "left", duoProduct),
    right: getPizzaDuoSupplementOptions(leftRecipe, rightRecipe, "right", duoProduct),
    whole: getPizzaDuoSupplementOptions(leftRecipe, rightRecipe, "whole", duoProduct),
  };
  const allowed = selections.filter(({ ingredientId, target }) =>
    isPizzaDuoSupplementTarget(target) && options[target].some(({ id }) => id === ingredientId));
  const supplements = normalizePizzaDuoSupplementSelections(allowed).flatMap(({ ingredientId, target }) => {
    const ingredient = options[target].find(({ id }) => id === ingredientId);
    if (!ingredient) return [];
    return [{
      ingredientId, target, ingredientName: ingredient.name,
      priceDeltaCents: getPizzaDuoSupplementPriceCents(ingredient.defaultPriceModifier.amountCents, target),
    }];
  });
  return {
    kind: "pizza_duo",
    leftRecipeId: leftRecipe.id,
    rightRecipeId: rightRecipe.id,
    leftRecipe: snapshotRecipe(leftRecipe, removedIngredients.left, baseOverrides.left),
    rightRecipe: snapshotRecipe(rightRecipe, removedIngredients.right, baseOverrides.right),
    ...(supplements.length ? { supplements } : {}),
  };
}

export function getPizzaDuoUnitPriceCents(duo: PizzaDuoComposition): number {
  return PIZZA_DUO_FIXED_PRICE_CENTS + (duo.supplements ?? []).reduce((total, item) => total + item.priceDeltaCents, 0);
}

export function pizzaDuoOrderSelection(duo: PizzaDuoComposition): PizzaDuoOrderSelection {
  const supplements = normalizePizzaDuoSupplementSelections(duo.supplements ?? []);
  return {
    leftRecipeId: duo.leftRecipeId,
    rightRecipeId: duo.rightRecipeId,
    ...(supplements.length ? { supplements } : {}),
    ...((duo.leftRecipe.removedIngredients?.length || duo.rightRecipe.removedIngredients?.length)
      ? { removedIngredients: {
          left: duo.leftRecipe.removedIngredients?.map(({ ingredientId }) => ingredientId) ?? [],
          right: duo.rightRecipe.removedIngredients?.map(({ ingredientId }) => ingredientId) ?? [],
        } }
      : {}),
    ...((duo.leftRecipe.baseOverride || duo.rightRecipe.baseOverride)
      ? { baseOverrides: {
          ...(duo.leftRecipe.baseOverride ? { left: duo.leftRecipe.baseOverride } : {}),
          ...(duo.rightRecipe.baseOverride ? { right: duo.rightRecipe.baseOverride } : {}),
        } }
      : {}),
  };
}

export function pizzaDuoCartKey(productId: string, duo: PizzaDuoComposition): string {
  // Left/right ordering is intentionally preserved for kitchen readability.
  const { leftRecipeId, rightRecipeId, supplements, removedIngredients, baseOverrides } = pizzaDuoOrderSelection(duo);
  if (!removedIngredients && !baseOverrides) {
    return `${productId}__duo:${JSON.stringify(supplements ? [leftRecipeId, rightRecipeId, supplements] : [leftRecipeId, rightRecipeId])}`;
  }
  return `${productId}__duo:${JSON.stringify([leftRecipeId, rightRecipeId, supplements ?? [], removedIngredients ?? {}, baseOverrides ?? {}])}`;
}
