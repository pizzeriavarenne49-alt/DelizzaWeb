export type StockAvailabilityProduct = {
  manualOutOfStock?: boolean;
  stockManaged?: boolean;
  stockQty?: number | null;
};

/**
 * A managed product without a canonical physical quantity is unavailable.
 * This deliberately does not fall back to legacy stock fields: enabling
 * stockManaged opts the product into the single catalog stock counter.
 */
export function isManagedStockUnavailable(product: StockAvailabilityProduct): boolean {
  return (
    product.stockManaged === true &&
    (typeof product.stockQty !== "number" ||
      !Number.isFinite(product.stockQty) ||
      product.stockQty <= 0)
  );
}

export function isProductUnavailable(product: StockAvailabilityProduct): boolean {
  return product.manualOutOfStock === true || isManagedStockUnavailable(product);
}
