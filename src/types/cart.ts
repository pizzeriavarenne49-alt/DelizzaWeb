/**
 * Cart types — aligned with WLHORIZON Flutter app.
 *
 * Mirrors the OrderItem structure used by the backend Cloud Functions
 * (createOrder, createPaymentIntent) so no price recalculation is needed.
 */

export interface CartItem {
  /** = product.id from wl_catalog_items */
  catalogItemId: string;
  /** Snapshot of product.name at the time the item was added */
  nameSnapshot: string;
  quantity: number;
  /** = product.price_cents (HT) */
  unitPriceCents: number;
  /** = unitPriceCents * quantity (HT) */
  totalCents: number;
  /** Tax rate in basis points (e.g. 1000 = 10 %) */
  taxRateBps: number;
}
