"use client";
import { buildCartKey } from "@/lib/cart-line-key";

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
import type { PizzaDuoComposition } from "@/types/cart";
import type { Product } from "@/types";
import { computeTaxFromTtcCents } from "@/types";
import { isProductUnavailable } from "@/lib/product-availability";
import { isAdditionalProductQuantityAvailable, canApplyCartQuantity, unavailableStockLines, isCartItemStockAvailable, type StockAvailabilityProduct } from "@/lib/product-availability";
import { useCatalogAvailability } from "@/contexts/CatalogAvailabilityContext";
import { recordMarketingEvent } from "@/marketing/marketing-client";
import { PIZZA_DUO_FIXED_PRICE_CENTS, pizzaDuoCartKey, isValidPizzaDuoProduct } from "@/lib/pizza-duo";
import { mergeCartItems, takeGuestCheckoutIntent } from "@/lib/guest-checkout-intent";

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
  replaceItemWithOptions: (
    cartKey: string,
    product: Product,
    customizations: CartItemCustomizations,
    quantity: number,
    selectedOptions?: SelectedOption[],
  ) => void;
  addPizzaDuo: (product: Product, duo: PizzaDuoComposition, quantity: number) => void;
  replacePizzaDuo: (cartKey: string, product: Product, duo: PizzaDuoComposition, quantity: number) => void;
  removeItem: (cartKey: string) => void;
  updateQuantity: (cartKey: string, quantity: number) => void;
  canAddProductQuantity: (productId: string, quantity?: number, product?: StockAvailabilityProduct) => boolean;
  canReplaceProductQuantity: (cartKey: string, productId: string, quantity: number, product?: StockAvailabilityProduct) => boolean;
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
  replaceItemWithOptions: noop,
  addPizzaDuo: noop,
  replacePizzaDuo: noop,
  removeItem: noop,
  updateQuantity: noop,
  canAddProductQuantity: () => false,
  canReplaceProductQuantity: () => false,
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

function customizedItem(
  product: Product,
  customizations: CartItemCustomizations,
  quantity: number,
  selectedOptions: SelectedOption[],
): CartItem {
  const optionDeltasCents = selectedOptions.reduce((sum, option) => sum + option.priceDeltaCents, 0);
  const supplementDeltasCents = (customizations.addedSupplementSnapshots ?? [])
    .reduce((sum, supplement) => sum + (supplement.priceDeltaCents ?? 0), 0);
  const unitPriceCents = product.price_cents + optionDeltasCents + supplementDeltasCents;
  return {
    catalogItemId: product.id,
    categoryId: product.category,
    nameSnapshot: product.name,
    quantity,
    unitPriceCents,
    totalCents: unitPriceCents * quantity,
    taxRateBps: product.tax_rate_bps,
    cartKey: buildCartKey(product.id, customizations),
    selectedOptions: selectedOptions.length > 0 ? selectedOptions : undefined,
    selectedTemplateOptions: customizations.selectedTemplateOptions,
    selectedLegacyOptions: customizations.selectedLegacyOptions,
    addedSupplements: customizations.addedSupplements,
    removedIngredients: customizations.removedIngredients,
    addedSupplementSnapshots: customizations.addedSupplementSnapshots,
    removedIngredientSnapshots: customizations.removedIngredientSnapshots,
    catalogKind: product.kind === "pizza_duo" ? "pizza_duo" : undefined,
  };
}

/** Ensure legacy cart items without taxRateBps or cartKey get sensible defaults */
function migrateLegacyItems(items: CartItem[]): CartItem[] {
  return items.map((item) => ({
    ...item,
    taxRateBps: typeof item.taxRateBps === "number" ? item.taxRateBps : DEFAULT_TAX_RATE_BPS,
    cartKey: item.duo ? pizzaDuoCartKey(item.catalogItemId, item.duo)
      : item.formulaId ? item.cartKey ?? item.formulaId
      : buildCartKey(item.catalogItemId, {
        ...item, selectedTemplateOptions: item.selectedTemplateOptions ?? selectedOptionsToTemplateOptions(item.selectedOptions),
      }),
    selectedTemplateOptions:
      item.selectedTemplateOptions ??
      selectedOptionsToTemplateOptions(item.selectedOptions),
    selectedLegacyOptions: item.selectedLegacyOptions,
    addedSupplements: item.addedSupplements ?? [],
    removedIngredients: item.removedIngredients ?? [],
    addedSupplementSnapshots: item.addedSupplementSnapshots ?? [],
    removedIngredientSnapshots: item.removedIngredientSnapshots ?? [],
    catalogKind: item.catalogKind ?? (item.duo ? "pizza_duo" : undefined),
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

  // A guest basket moves only after a deliberate checkout hand-off. It is
  // never read during an ordinary login and is consumed once for this uid.
  if (!isGuestScope) {
    const handoff = takeGuestCheckoutIntent();
    if (handoff.length > 0) {
      nextItems = mergeCartItems(nextItems, handoff);
      removeStorageItem(GUEST_STORAGE_KEY);
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
  const catalogAvailability = useCatalogAvailability();
  const canAddProductQuantity = useCallback(
    (productId: string, quantity = 1, product?: StockAvailabilityProduct) =>
      isAdditionalProductQuantityAvailable(items, productId, quantity, catalogAvailability, product),
    [items, catalogAvailability],
  );
  const canReplaceProductQuantity = useCallback(
    (cartKey: string, productId: string, quantity: number, product?: StockAvailabilityProduct) => {
      const withoutCurrent = items.filter((item) => item.cartKey !== cartKey);
      return isAdditionalProductQuantityAvailable(
        withoutCurrent,
        productId,
        quantity,
        catalogAvailability,
        product,
      );
    },
    [items, catalogAvailability],
  );

  // Persist to localStorage whenever items change
  useEffect(() => {
    writeStorageItem(storageKey, JSON.stringify(items));
  }, [items, storageKey]);

  const addItem = useCallback((product: Product) => {
    if (product.kind === "pizza_duo" || isProductUnavailable(product) || !canAddProductQuantity(product.id, 1, product)) return;

    recordMarketingEvent("add_to_cart", { productId: product.id, quantity: 1 });

    const cartKey = buildCartKey(product.id, {
      selectedTemplateOptions: {},
      selectedLegacyOptions: {},
      addedSupplements: [],
      removedIngredients: [],
    });
    setItems((prev) => {
      if (!isAdditionalProductQuantityAvailable(prev, product.id, 1, catalogAvailability, product)) return prev;
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
          catalogKind: undefined,
        },
      ];
    });
  }, [canAddProductQuantity, catalogAvailability]);

  const addItemWithOptions = useCallback(
    (
      product: Product,
      customizations: CartItemCustomizations,
      quantity: number,
      selectedOptions: SelectedOption[] = [],
    ) => {
      if (product.kind === "pizza_duo" || isProductUnavailable(product) || !canAddProductQuantity(product.id, quantity, product)) return;
      if (!Number.isInteger(quantity) || quantity <= 0) return;

      recordMarketingEvent("add_to_cart", { productId: product.id, quantity });

      const cartKey = buildCartKey(product.id, customizations);
      const nextItem = customizedItem(product, customizations, quantity, selectedOptions);

      setItems((prev) => {
        if (!isAdditionalProductQuantityAvailable(prev, product.id, quantity, catalogAvailability, product)) return prev;
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
            ...nextItem,
            cartKey,
          },
        ];
      });
    },
    [canAddProductQuantity, catalogAvailability],
  );

  const replaceItemWithOptions = useCallback((
    cartKey: string,
    product: Product,
    customizations: CartItemCustomizations,
    quantity: number,
    selectedOptions: SelectedOption[] = [],
  ) => {
    if (product.kind === "pizza_duo" || !Number.isInteger(quantity) || quantity <= 0 || isProductUnavailable(product)) return;
    const nextItem = customizedItem(product, customizations, quantity, selectedOptions);
    setItems((previous) => {
      if (!previous.some((item) => item.cartKey === cartKey)) return previous;
      const withoutCurrent = previous.filter((item) => item.cartKey !== cartKey);
      if (!isAdditionalProductQuantityAvailable(withoutCurrent, product.id, quantity, catalogAvailability, product)) return previous;
      const sameComposition = withoutCurrent.find((item) => item.cartKey === nextItem.cartKey);
      if (sameComposition) {
        return withoutCurrent.map((item) => item.cartKey === nextItem.cartKey
          ? { ...item, quantity: item.quantity + quantity, totalCents: item.unitPriceCents * (item.quantity + quantity) }
          : item);
      }
      return previous.map((item) => item.cartKey === cartKey ? nextItem : item);
    });
  }, [catalogAvailability]);

  const makePizzaDuoItem = useCallback((product: Product, duo: PizzaDuoComposition, quantity: number): CartItem => ({
    catalogItemId: product.id,
    categoryId: product.category,
    nameSnapshot: product.name,
    quantity,
    unitPriceCents: PIZZA_DUO_FIXED_PRICE_CENTS,
    totalCents: PIZZA_DUO_FIXED_PRICE_CENTS * quantity,
    taxRateBps: product.tax_rate_bps,
    cartKey: pizzaDuoCartKey(product.id, duo),
    catalogKind: "pizza_duo",
    duo,
  }), []);

  const addPizzaDuo = useCallback((product: Product, duo: PizzaDuoComposition, quantity: number) => {
    if (!isValidPizzaDuoProduct(product) || !Number.isInteger(quantity) || quantity <= 0 || isProductUnavailable(product)) return;
    const nextItem = makePizzaDuoItem(product, duo, quantity);
    setItems((previous) => {
      if (unavailableStockLines([...previous, nextItem], catalogAvailability).length > 0) return previous;
      const existing = previous.find((item) => item.cartKey === nextItem.cartKey);
      if (!existing) return [...previous, nextItem];
      const nextQuantity = existing.quantity + quantity;
      return previous.map((item) => item.cartKey === nextItem.cartKey
        ? { ...item, quantity: nextQuantity, totalCents: item.unitPriceCents * nextQuantity }
        : item);
    });
  }, [catalogAvailability, makePizzaDuoItem]);

  const replacePizzaDuo = useCallback((cartKey: string, product: Product, duo: PizzaDuoComposition, quantity: number) => {
    if (!isValidPizzaDuoProduct(product) || !Number.isInteger(quantity) || quantity <= 0 || isProductUnavailable(product)) return;
    const nextItem = makePizzaDuoItem(product, duo, quantity);
    setItems((previous) => {
      if (!previous.some((item) => item.cartKey === cartKey)) return previous;
      const withoutCurrent = previous.filter((item) => item.cartKey !== cartKey);
      if (!isCartItemStockAvailable(withoutCurrent, nextItem, catalogAvailability)) return previous;
      const duplicate = withoutCurrent.find((item) => item.cartKey === nextItem.cartKey);
      if (!duplicate) return previous.map((item) => item.cartKey === cartKey ? nextItem : item);
      return withoutCurrent.map((item) => item.cartKey === nextItem.cartKey
        ? { ...item, quantity: item.quantity + quantity, totalCents: item.unitPriceCents * (item.quantity + quantity) }
        : item);
    });
  }, [catalogAvailability, makePizzaDuoItem]);

  const removeItem = useCallback((cartKey: string) => {
    const existing = items.find((item) => item.cartKey === cartKey);
    if (!existing) return;
    recordMarketingEvent("remove_from_cart", { productId: existing.catalogItemId, quantity: 1 });
    setItems((prev) => {
      const current = prev.find((i) => i.cartKey === cartKey);
      if (!current) return prev;
      if (current.quantity > 1) {
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
  }, [items]);

  const updateQuantity = useCallback(
    (cartKey: string, quantity: number) => {
      const existing = items.find((item) => item.cartKey === cartKey);
      if (existing && Number.isFinite(quantity) && quantity !== existing.quantity) {
        recordMarketingEvent(quantity > existing.quantity ? "add_to_cart" : "remove_from_cart", {
          productId: existing.catalogItemId,
          quantity: Math.abs(quantity - existing.quantity),
        });
      }
      if (quantity <= 0) {
        setItems((prev) => prev.filter((i) => i.cartKey !== cartKey));
        return;
      }
      setItems((prev) => {
        const current = prev.find((item) => item.cartKey === cartKey);
        if (!current) return prev;
        if (!canApplyCartQuantity(prev, cartKey, quantity, catalogAvailability)) return prev;
        return prev.map((i) => i.cartKey === cartKey
          ? { ...i, quantity, totalCents: i.unitPriceCents * quantity }
          : i);
      });
    },
    [items, catalogAvailability],
  );

  const clearCart = useCallback(() => {
    // This is also invoked after a completed order. It must not manufacture
    // cart removals for an already purchased basket.
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
        replaceItemWithOptions,
        addPizzaDuo,
        replacePizzaDuo,
        removeItem,
        updateQuantity,
        canAddProductQuantity,
        canReplaceProductQuantity,
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

