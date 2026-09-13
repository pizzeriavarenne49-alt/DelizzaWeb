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

export interface CartItemCustomizations {
  /** templateId -> choiceIds, canonical createOrder contract */
  selectedTemplateOptions: Record<string, string[]>;
  /** Ingredient IDs, canonical createOrder contract */
  addedSupplements: string[];
  /** Ingredient IDs, canonical createOrder contract */
  removedIngredients: string[];
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
  addedSupplements?: string[];
  removedIngredients?: string[];
  addedSupplementSnapshots?: IngredientSnapshot[];
  removedIngredientSnapshots?: IngredientSnapshot[];
  /** Optional composed menu identifier for formula items */
  formulaId?: string;
  /** Formula step choices keyed by step id */
  formulaStepChoices?: Record<string, string[]>;
}
