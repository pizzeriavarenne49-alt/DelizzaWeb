"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { CartItem } from "@/types/cart";
import type { Product } from "@/types";
import { computeTaxCents } from "@/types";

const STORAGE_KEY = "delizza_cart";

/** Default tax rate (bps) used when a cart item has no taxRateBps (legacy data) */
const DEFAULT_TAX_RATE_BPS = 1000;

export interface TaxBreakdownEntry {
  rateBps: number;
  taxCents: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (catalogItemId: string) => void;
  updateQuantity: (catalogItemId: string, quantity: number) => void;
  clearCart: () => void;
  getSubtotalCents: () => number;
  getTaxCents: () => number;
  getTotalCents: () => number;
  getTaxBreakdown: () => TaxBreakdownEntry[];
  itemCount: number;
  isEmpty: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

/** Ensure legacy cart items without taxRateBps get a sensible default */
function migrateLegacyItems(items: CartItem[]): CartItem[] {
  return items.map((item) =>
    typeof item.taxRateBps === "number"
      ? item
      : { ...item, taxRateBps: DEFAULT_TAX_RATE_BPS },
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    // Lazy initializer runs only on the client after hydration
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        if (Array.isArray(parsed)) return migrateLegacyItems(parsed);
      }
    } catch {
      // Ignore malformed data
    }
    return [];
  });

  // Persist to localStorage whenever items change
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((product: Product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.catalogItemId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.catalogItemId === product.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                totalCents: i.unitPriceCents * (i.quantity + 1),
              }
            : i,
        );
      }
      return [
        ...prev,
        {
          catalogItemId: product.id,
          nameSnapshot: product.name,
          quantity: 1,
          unitPriceCents: product.price_cents,
          totalCents: product.price_cents,
          taxRateBps: product.tax_rate_bps,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((catalogItemId: string) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.catalogItemId === catalogItemId);
      if (!existing) return prev;
      if (existing.quantity > 1) {
        return prev.map((i) =>
          i.catalogItemId === catalogItemId
            ? {
                ...i,
                quantity: i.quantity - 1,
                totalCents: i.unitPriceCents * (i.quantity - 1),
              }
            : i,
        );
      }
      return prev.filter((i) => i.catalogItemId !== catalogItemId);
    });
  }, []);

  const updateQuantity = useCallback(
    (catalogItemId: string, quantity: number) => {
      if (quantity <= 0) {
        setItems((prev) =>
          prev.filter((i) => i.catalogItemId !== catalogItemId),
        );
        return;
      }
      setItems((prev) =>
        prev.map((i) =>
          i.catalogItemId === catalogItemId
            ? { ...i, quantity, totalCents: i.unitPriceCents * quantity }
            : i,
        ),
      );
    },
    [],
  );

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getSubtotalCents = useCallback(
    () => items.reduce((sum, i) => sum + i.totalCents, 0),
    [items],
  );

  const getTaxCents = useCallback(
    () =>
      items.reduce(
        (sum, i) => sum + computeTaxCents(i.totalCents, i.taxRateBps),
        0,
      ),
    [items],
  );

  const getTotalCents = useCallback(
    () => getSubtotalCents() + getTaxCents(),
    [getSubtotalCents, getTaxCents],
  );

  const getTaxBreakdown = useCallback((): TaxBreakdownEntry[] => {
    const map = new Map<number, number>();
    for (const item of items) {
      const rate = item.taxRateBps;
      const tax = computeTaxCents(item.totalCents, rate);
      map.set(rate, (map.get(rate) ?? 0) + tax);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([rateBps, taxCents]) => ({ rateBps, taxCents }));
  }, [items]);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const isEmpty = items.length === 0;

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getSubtotalCents,
        getTaxCents,
        getTotalCents,
        getTaxBreakdown,
        itemCount,
        isEmpty,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
