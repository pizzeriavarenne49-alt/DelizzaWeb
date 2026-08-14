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

export interface CartItem {
  /** = product.id from wl_catalog_items */
  catalogItemId: string;
  /** = product.category, used locally for loyalty eligibility */
  categoryId?: string;
  /** Snapshot of product.name at the time the item was added */
  nameSnapshot: string;
  quantity: number;
  /** = product.price_cents (TTC) + sum of selectedOptions priceDeltaCents */
  unitPriceCents: number;
  /** = unitPriceCents * quantity (TTC) */
  totalCents: number;
  /** Tax rate in basis points (e.g. 1000 = 10 %) */
  taxRateBps: number;
  /** Unique key to differentiate same product with different options (productId + sorted option hash) */
  cartKey: string;
  /** Selected customization options */
  selectedOptions?: SelectedOption[];
  /** Optional composed menu identifier for formula items */
  formulaId?: string;
  /** Formula step choices keyed by step id */
  formulaStepChoices?: Record<string, string[]>;
}
