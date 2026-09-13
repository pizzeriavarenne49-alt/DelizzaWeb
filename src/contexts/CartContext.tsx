"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { CartItem, CartItemCustomizations, SelectedOption } from "@/types/cart";
import type { Product } from "@/types";
import { computeTaxFromTtcCents } from "@/types";

const LEGACY_STORAGE_KEYS = ["delizza_cart", "cart", "basket", "panier"];
const GUEST_STORAGE_KEY = "delizza_cart_guest";
const AUTH_STORAGE_PREFIX = "delizza_cart_uid_";

/** Default tax rate (bps) used when a cart item has no taxRateBps (legacy data) */
const DEFAULT_TAX_RATE_BPS = 1000;

export interface TaxBreakdownEntry {
  rateBps: number;
  taxCents: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (product: Product) => void;
  addItemWithOptions: (
    product: Product,
    customizations: CartItemCustomizations,
    quantity: number,
    selectedOptions?: SelectedOption[],
  ) => void;
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

const noop = () => undefined;

const EMPTY_CART_CONTEXT: CartContextValue = {
  items: [],
  addItem: noop,
  addItemWithOptions: noop,
  removeItem: noop,
  updateQuantity: noop,
  clearCart: noop,
  getSubtotalCents: () => 0,
  getTaxCents: () => 0,
  getTotalCents: () => 0,
  getTaxBreakdown: () => [],
  itemCount: 0,
  isEmpty: true,
};

function selectedOptionsToTemplateOptions(selectedOptions: SelectedOption[] = []): Record<string, string[]> {
  return Object.fromEntries(
    selectedOptions.map((option) => [option.optionId, [...option.choiceIds]]),
  );
}

function buildCartKey(productId: string, customizations: CartItemCustomizations): string {
  const parts = [
    ...Object.entries(customizations.selectedTemplateOptions)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([templateId, choiceIds]) => `${templateId}:${choiceIds.slice().sort().join(",")}`),
    `add:${customizations.addedSupplements.slice().sort().join(",")}`,
    `remove:${customizations.removedIngredients.slice().sort().join(",")}`,
  ].filter((part) => !part.endsWith(":") && !part.endsWith("add:") && !part.endsWith("remove:"));
  if (parts.length === 0) return productId;
  const hash = parts.join("|");
  return `${productId}__${hash}`;
}

/** Ensure legacy cart items without taxRateBps or cartKey get sensible defaults */
function migrateLegacyItems(items: CartItem[]): CartItem[] {
  return items.map((item) => ({
    ...item,
    taxRateBps: typeof item.taxRateBps === "number" ? item.taxRateBps : DEFAULT_TAX_RATE_BPS,
    cartKey: item.cartKey ?? item.catalogItemId,
    selectedTemplateOptions:
      item.selectedTemplateOptions ??
      selectedOptionsToTemplateOptions(item.selectedOptions),
    addedSupplements: item.addedSupplements ?? [],
    removedIngredients: item.removedIngredients ?? [],
    addedSupplementSnapshots: item.addedSupplementSnapshots ?? [],
    removedIngredientSnapshots: item.removedIngredientSnapshots ?? [],
  }));
}

function getCartStorageKey(uid: string | null): string {
  return uid ? `${AUTH_STORAGE_PREFIX}${uid}` : GUEST_STORAGE_KEY;
}

function readCartItems(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    return migrateLegacyItems(parsed);
  } catch {
    return [];
  }
}

function readStorageItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageItem(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeStorageItem(key: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore unavailable storage.
  }
}

function removeLegacyCartKeys() {
  for (const key of LEGACY_STORAGE_KEYS) {
    removeStorageItem(key);
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <CartContext.Provider value={EMPTY_CART_CONTEXT}>{children}</CartContext.Provider>;
  }

  const storageKey = getCartStorageKey(user?.uid ?? null);

  return (
    <CartStateProvider key={storageKey} storageKey={storageKey}>
      {children}
    </CartStateProvider>
  );
}

function readInitialCartItems(storageKey: string): CartItem[] {
  const isGuestScope = storageKey === GUEST_STORAGE_KEY;
  let nextItems = readCartItems(readStorageItem(storageKey));

  if (nextItems.length === 0 && isGuestScope) {
    const legacyRaw = LEGACY_STORAGE_KEYS.map((key) => readStorageItem(key)).find(Boolean) ?? null;
    nextItems = readCartItems(legacyRaw);
    if (nextItems.length > 0) {
      if (!writeStorageItem(storageKey, JSON.stringify(nextItems))) {
        return nextItems;
      }
    }
  }

  // Drop legacy global keys only after resolving the scoped cart.
  removeLegacyCartKeys();

  return nextItems;
}

function CartStateProvider({
  children,
  storageKey,
}: {
  children: ReactNode;
  storageKey: string;
}) {
  const [items, setItems] = useState<CartItem[]>(() => readInitialCartItems(storageKey));

  // Persist to localStorage whenever items change
  useEffect(() => {
    writeStorageItem(storageKey, JSON.stringify(items));
  }, [items, storageKey]);

  const addItem = useCallback((product: Product) => {
    if (product.manualOutOfStock === true) return;

    const cartKey = buildCartKey(product.id, {
      selectedTemplateOptions: {},
      addedSupplements: [],
      removedIngredients: [],
    });
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
          categoryId: product.category,
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
    (
      product: Product,
      customizations: CartItemCustomizations,
      quantity: number,
      selectedOptions: SelectedOption[] = [],
    ) => {
      if (product.manualOutOfStock === true) return;

      const cartKey = buildCartKey(product.id, customizations);
      const optionDeltasCents = selectedOptions.reduce((sum, o) => sum + o.priceDeltaCents, 0);
      const supplementDeltasCents = (customizations.addedSupplementSnapshots ?? [])
        .reduce((sum, supplement) => sum + (supplement.priceDeltaCents ?? 0), 0);
      const deltasCents = optionDeltasCents + supplementDeltasCents;
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
            categoryId: product.category,
            nameSnapshot: product.name,
            quantity,
            unitPriceCents,
            totalCents: unitPriceCents * quantity,
            taxRateBps: product.tax_rate_bps,
            cartKey,
            selectedOptions: selectedOptions.length > 0 ? selectedOptions : undefined,
            selectedTemplateOptions: customizations.selectedTemplateOptions,
            addedSupplements: customizations.addedSupplements,
            removedIngredients: customizations.removedIngredients,
            addedSupplementSnapshots: customizations.addedSupplementSnapshots,
            removedIngredientSnapshots: customizations.removedIngredientSnapshots,
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
    // Client cart amounts are already TTC. This subtotal is TTC before loyalty rewards.
    () => items.reduce((sum, i) => sum + i.totalCents, 0),
    [items],
  );

  const getTaxCents = useCallback(
    () =>
      items.reduce(
        (sum, i) => sum + computeTaxFromTtcCents(i.totalCents, i.taxRateBps),
        0,
      ),
    [items],
  );

  const getTotalCents = useCallback(
    () => getSubtotalCents(),
    [getSubtotalCents],
  );

  const getTaxBreakdown = useCallback((): TaxBreakdownEntry[] => {
    const map = new Map<number, number>();
    for (const item of items) {
      const rate = item.taxRateBps;
      const tax = computeTaxFromTtcCents(item.totalCents, rate);
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

