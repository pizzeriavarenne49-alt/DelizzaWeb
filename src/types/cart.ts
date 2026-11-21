/**
 * Cart types — aligned with WLHORIZON Flutter app.
 *
 * These are client-controlled snapshots for display and transport only.
 * Cloud Functions must always reload catalog data and recalculate prices,
 * options, taxes, discounts, and totals server-side before accepting an order.
 */

export interface SelectedOption {
  optionId: string;
  optionName: string;
  choiceIds: string[];
  choiceNames: string[];
  /** Total TTC price modifier for this option in cents */
  priceDeltaCents: number;
}

export interface IngredientSnapshot {
  ingredientId: string;
  ingredientName: string;
  priceDeltaCents?: number;
}

export interface PizzaDuoRecipeSnapshot {
  recipeId: string;
  recipeName: string;
  /** Explicit catalog base retained for customer and kitchen readability. */
  base: "tomate" | "creme";
  /** Customer-selected free base substitution. Default recipe base remains above. */
  baseOverride?: "tomate" | "crème";
  description?: string;
  ingredients?: string[];
  /** Ingredients removed from this half, retained for kitchen readability. */
  removedIngredients?: IngredientSnapshot[];
}

export type PizzaDuoSupplementTarget = "whole" | "left" | "right";

export interface PizzaDuoSupplementSelection {
  ingredientId: string;
  target: PizzaDuoSupplementTarget;
}

export interface PizzaDuoSupplementSnapshot extends PizzaDuoSupplementSelection {
  ingredientName: string;
  priceDeltaCents: number;
}

export interface PizzaDuoOrderSelection {
  leftRecipeId: string;
  rightRecipeId: string;
  supplements?: PizzaDuoSupplementSelection[];
  removedIngredients?: { left: string[]; right: string[] };
  baseOverrides?: { left?: "tomate" | "crème"; right?: "tomate" | "crème" };
}

/**
 * Client display snapshot for one physical Pizza Duo.
 * The order function receives the recipe IDs and supplement selections.
 * It resolves its own ingredient snapshots, eligibility and prices.
 */
export interface PizzaDuoComposition {
  kind: "pizza_duo";
  leftRecipeId: string;
  rightRecipeId: string;
  leftRecipe: PizzaDuoRecipeSnapshot;
  rightRecipe: PizzaDuoRecipeSnapshot;
  supplements?: PizzaDuoSupplementSnapshot[];
}

export interface CartItemCustomizations {
  /** templateId -> choiceIds, canonical createOrder contract */
  selectedTemplateOptions: Record<string, string[]>;
  /** Inline catalog optionId -> choiceIds, legacy createOrder contract. */
  selectedLegacyOptions?: Record<string, string[]>;
  /** Ingredient IDs, canonical createOrder contract */
  addedSupplements: string[];
  /** Ingredient IDs, canonical createOrder contract */
  removedIngredients: string[];
  /** Free base substitution on a standard pizza. */
  recipeBaseOverride?: "tomate" | "crème";
  /** Display snapshots to avoid lookups while rendering the cart. */
  addedSupplementSnapshots?: IngredientSnapshot[];
  removedIngredientSnapshots?: IngredientSnapshot[];
}

export interface CartItem {
  /** = product.id from wl_catalog_items */
  catalogItemId: string;
  /** = product.category, used locally for loyalty eligibility */
  categoryId?: string;
  /** Snapshot of product.name at the time the item was added */
  nameSnapshot: string;
  quantity: number;
  /** = product.price_cents (TTC) + selected option and supplement display deltas */
  unitPriceCents: number;
  /** = unitPriceCents * quantity (TTC) */
  totalCents: number;
  /** Tax rate in basis points (e.g. 1000 = 10 %) */
  taxRateBps: number;
  /** Unique key to differentiate same product with different customizations */
  cartKey: string;
  /** Selected customization options */
  selectedOptions?: SelectedOption[];
  selectedTemplateOptions?: Record<string, string[]>;
  selectedLegacyOptions?: Record<string, string[]>;
  addedSupplements?: string[];
  removedIngredients?: string[];
  recipeBaseOverride?: "tomate" | "crème";
  addedSupplementSnapshots?: IngredientSnapshot[];
  removedIngredientSnapshots?: IngredientSnapshot[];
  /** Optional composed menu identifier for formula items */
  formulaId?: string;
  /** Formula step choices keyed by step id */
  formulaStepChoices?: Record<string, string[]>;
  /** Present only for the explicit Pizza Duo catalog product. */
  catalogKind?: "pizza_duo";
  duo?: PizzaDuoComposition;
}
