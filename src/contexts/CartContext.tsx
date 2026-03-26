"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { CartItem, SelectedOption } from "@/types/cart";
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
  addItemWithOptions: (product: Product, selectedOptions: SelectedOption[], quantity: number) => void;
  removeItem: (cartKey: string) => void;
  updateQuantity: (cartKey: string, quantity: number) => void;
  clearCart: () => void;
  getSubtotalCents: () => number;
  getTaxCents: () => number;
  getTotalCents: () => number;
  getTaxBreakdown: () => TaxBreakdownEntry[];
  itemCount: number;
  isEmpty: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

/** Generate a stable cartKey from a productId and sorted selectedOptions */
function buildCartKey(productId: string, selectedOptions: SelectedOption[]): string {
  if (selectedOptions.length === 0) return productId;
  const hash = selectedOptions
    .slice()
    .sort((a, b) => a.optionId.localeCompare(b.optionId))
    .map((o) => `${o.optionId}:${o.choiceIds.slice().sort().join(",")}`)
    .join("|");
  return `${productId}__${hash}`;
}

/** Ensure legacy cart items without taxRateBps or cartKey get sensible defaults */
function migrateLegacyItems(items: CartItem[]): CartItem[] {
  return items.map((item) => ({
    ...item,
    taxRateBps: typeof item.taxRateBps === "number" ? item.taxRateBps : DEFAULT_TAX_RATE_BPS,
    cartKey: item.cartKey ?? item.catalogItemId,
  }));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const hydrated = useRef(false);

  // Hydrate cart from localStorage after mount (avoids SSR/client mismatch)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        if (Array.isArray(parsed)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setItems(migrateLegacyItems(parsed));
        }
      }
    } catch {
      // Ignore malformed data
    }
    hydrated.current = true;
  }, []);

  // Persist to localStorage whenever items change
  useEffect(() => {
    if (!hydrated.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((product: Product) => {
    const cartKey = buildCartKey(product.id, []);
    setItems((prev) => {
      const existing = prev.find((i) => i.cartKey === cartKey);
      if (existing) {
        return prev.map((i) =>
          i.cartKey === cartKey
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
          cartKey,
        },
      ];
    });
  }, []);

  const addItemWithOptions = useCallback(
    (product: Product, selectedOptions: SelectedOption[], quantity: number) => {
      const cartKey = buildCartKey(product.id, selectedOptions);
      const deltasCents = selectedOptions.reduce((sum, o) => sum + o.priceDeltaCents, 0);
      const unitPriceCents = product.price_cents + deltasCents;

      setItems((prev) => {
        const existing = prev.find((i) => i.cartKey === cartKey);
        if (existing) {
          const newQty = existing.quantity + quantity;
          return prev.map((i) =>
            i.cartKey === cartKey
              ? { ...i, quantity: newQty, totalCents: i.unitPriceCents * newQty }
              : i,
          );
        }
        return [
          ...prev,
          {
            catalogItemId: product.id,
            nameSnapshot: product.name,
            quantity,
            unitPriceCents,
            totalCents: unitPriceCents * quantity,
            taxRateBps: product.tax_rate_bps,
            cartKey,
            selectedOptions: selectedOptions.length > 0 ? selectedOptions : undefined,
          },
        ];
      });
    },
    [],
  );

  const removeItem = useCallback((cartKey: string) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.cartKey === cartKey);
      if (!existing) return prev;
      if (existing.quantity > 1) {
        return prev.map((i) =>
          i.cartKey === cartKey
            ? {
                ...i,
                quantity: i.quantity - 1,
                totalCents: i.unitPriceCents * (i.quantity - 1),
              }
            : i,
        );
      }
      return prev.filter((i) => i.cartKey !== cartKey);
    });
  }, []);

  const updateQuantity = useCallback(
    (cartKey: string, quantity: number) => {
      if (quantity <= 0) {
        setItems((prev) => prev.filter((i) => i.cartKey !== cartKey));
        return;
      }
      setItems((prev) =>
        prev.map((i) =>
          i.cartKey === cartKey
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
        addItemWithOptions,
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

