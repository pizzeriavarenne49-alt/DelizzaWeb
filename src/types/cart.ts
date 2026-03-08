/**
 * Cart types — aligned with WLHORIZON Flutter app.
 *
 * Mirrors the OrderItem structure used by the backend Cloud Functions
 * (createOrder, createPaymentIntent) so no price recalculation is needed.
 */

export interface SelectedOption {
  optionId: string;
  optionName: string;
  choiceIds: string[];
  choiceNames: string[];
  /** Total price modifier for this option in cents */
  priceDeltaCents: number;
}

export interface CartItem {
  /** = product.id from wl_catalog_items */
  catalogItemId: string;
  /** Snapshot of product.name at the time the item was added */
  nameSnapshot: string;
  quantity: number;
  /** = product.price_cents (HT) + sum of selectedOptions priceDeltaCents */
  unitPriceCents: number;
  /** = unitPriceCents * quantity (HT) */
  totalCents: number;
  /** Tax rate in basis points (e.g. 1000 = 10 %) */
  taxRateBps: number;
  /** Unique key to differentiate same product with different options (productId + sorted option hash) */
  cartKey: string;
  /** Selected customization options */
  selectedOptions?: SelectedOption[];
}
