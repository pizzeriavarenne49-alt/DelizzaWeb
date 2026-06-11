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
import { useAuth } from "@/contexts/AuthContext";
import type { CartItem, SelectedOption } from "@/types/cart";
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

function removeLegacyCartKeys() {
  for (const key of LEGACY_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const hydrated = useRef(false);
  const activeStorageKeyRef = useRef<string>(GUEST_STORAGE_KEY);
  const suppressPersistRef = useRef(false);

  // Hydrate cart from the auth-scoped storage key after mount and on session changes.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const nextStorageKey = getCartStorageKey(user?.uid ?? null);
    const isGuestScope = nextStorageKey === GUEST_STORAGE_KEY;
    const existingScopedRaw = localStorage.getItem(nextStorageKey);
    const legacyRaw = LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean) ?? null;

    suppressPersistRef.current = true;

    try {
      let nextItems = readCartItems(existingScopedRaw);

      if (nextItems.length === 0 && isGuestScope && legacyRaw) {
        nextItems = readCartItems(legacyRaw);
        if (nextItems.length > 0) {
          localStorage.setItem(nextStorageKey, JSON.stringify(nextItems));
        }
      }

      // Always drop legacy global keys once we have resolved the scoped cart.
      removeLegacyCartKeys();

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItems(nextItems);
      activeStorageKeyRef.current = nextStorageKey;
    } catch {
      // Ignore malformed data
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItems([]);
      activeStorageKeyRef.current = nextStorageKey;
    }

    queueMicrotask(() => {
      suppressPersistRef.current = false;
    });

    hydrated.current = true;
  }, [user?.uid]);

  // Persist to localStorage whenever items change
  useEffect(() => {
    if (!hydrated.current || suppressPersistRef.current) return;
    localStorage.setItem(activeStorageKeyRef.current, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((product: Product) => {
    if (product.manualOutOfStock === true) return;

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
    (product: Product, selectedOptions: SelectedOption[], quantity: number) => {
      if (product.manualOutOfStock === true) return;

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
            categoryId: product.category,
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

