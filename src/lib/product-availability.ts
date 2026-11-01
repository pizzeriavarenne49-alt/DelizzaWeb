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
      !Number.isSafeInteger(product.stockQty) ||
      product.stockQty <= 0)
  );
}

export function isProductUnavailable(product: StockAvailabilityProduct): boolean {
  return product.manualOutOfStock === true || isManagedStockUnavailable(product);
}

type StockCartLine = {
  catalogItemId: string;
  quantity: number;
  formulaId?: string;
  formulaStepChoices?: Record<string, string[]>;
};

/** A formula consumes its selected product components, never a separate quota. */
export function stockDemandByProduct<T extends StockCartLine>(items: T[]): Map<string, number> {
  const totals = new Map<string, number>();
  const add = (productId: string, quantity: number) => totals.set(productId, (totals.get(productId) ?? 0) + quantity);
  for (const item of items) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) continue;
    if (item.formulaId && item.formulaStepChoices) {
      for (const choices of Object.values(item.formulaStepChoices)) {
        if (!Array.isArray(choices)) continue;
        for (const productId of choices) if (typeof productId === "string" && productId) add(productId, item.quantity);
      }
    } else add(item.catalogItemId, item.quantity);
  }
  return totals;
}

export function isAdditionalProductQuantityAvailable<T extends StockCartLine>(
  items: T[], productId: string, quantity: number, products: Record<string, StockAvailabilityProduct> | null,
  fallbackProduct?: StockAvailabilityProduct,
): boolean {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) return false;
  const product = products === null ? fallbackProduct : products[productId];
  if (products === null && !fallbackProduct) return true;
  if (!product) return false;
  if (isProductUnavailable(product) || product.stockManaged !== true) return !isProductUnavailable(product);
  return (stockDemandByProduct(items).get(productId) ?? 0) + quantity <= (product.stockQty ?? 0);
}

export function unavailableStockLines<T extends StockCartLine>(
  items: T[], products: Record<string, StockAvailabilityProduct> | null,
): T[] {
  if (products === null) return [];
  const totals = stockDemandByProduct(items);
  return items.filter((item) => {
    const productIds = item.formulaId && item.formulaStepChoices
      ? Object.values(item.formulaStepChoices).flat().filter((id): id is string => typeof id === "string" && id.length > 0)
      : [item.catalogItemId];
    return productIds.some((productId) => {
      const product = products[productId];
      return !product || isProductUnavailable(product) ||
        (product.stockManaged === true && (totals.get(productId) ?? 0) > (product.stockQty ?? 0));
    });
  });
}

/** Testable counterpart of the functional cart state update. */
export function canApplyCartQuantity<T extends StockCartLine & { cartKey: string }>(
  items: T[], cartKey: string, quantity: number, products: Record<string, StockAvailabilityProduct> | null,
): boolean {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) return false;
  const current = items.find((item) => item.cartKey === cartKey);
  if (!current) return false;
  const candidate = items.map((item) => item.cartKey === cartKey ? { ...item, quantity } : item);
  return !unavailableStockLines(candidate, products).some((item) => item.cartKey === cartKey);
}
