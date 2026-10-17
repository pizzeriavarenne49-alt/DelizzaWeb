"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { StockAvailabilityProduct } from "@/lib/product-availability";
import { unavailableStockLines } from "@/lib/product-availability";
import type { CartItem } from "@/types/cart";
import type { CartAvailabilityIssue } from "@/lib/cart-availability";

type Availability = Record<string, StockAvailabilityProduct>;
const CatalogAvailabilityContext = createContext<Availability | null>(null);

export function CatalogAvailabilityProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Availability | null>(null);
  useEffect(() => {
    const source = new EventSource("/api/catalog/availability");
    source.onmessage = (event) => {
      try { setProducts(JSON.parse(event.data) as Availability); }
      catch { /* Keep the last confirmed snapshot until reconnection. */ }
    };
    return () => source.close();
  }, []);
  return <CatalogAvailabilityContext.Provider value={products}>{children}</CatalogAvailabilityContext.Provider>;
}

export function useCatalogAvailability() {
  return useContext(CatalogAvailabilityContext);
}

export function useCartStockIssues(items: CartItem[]): CartAvailabilityIssue[] {
  return unavailableStockLines(items, useCatalogAvailability()).map((item) => ({
    cartKey: item.cartKey, catalogItemId: item.catalogItemId,
    productName: item.nameSnapshot, kind: "product_out_of_stock",
    message: `${item.nameSnapshot} : stock insuffisant pour la quantité du panier.`,
    displayLabel: `${item.nameSnapshot} — stock insuffisant`,
  }));
}

export function useLiveProduct<T extends StockAvailabilityProduct & { id: string }>(product: T): T {
  const products = useCatalogAvailability();
  if (products === null) return product;
  // Removal from the public catalogue also makes an already open card unavailable.
  return { ...product, ...(products[product.id] ?? { manualOutOfStock: true }) };
}
