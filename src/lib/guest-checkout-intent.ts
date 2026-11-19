import type { CartItem } from "@/types/cart";

const KEY = "delizza_guest_checkout_intent_v1";
const MAX_AGE_MS = 20 * 60 * 1000;

interface GuestCheckoutIntent { version: 1; createdAt: number; items: CartItem[]; }

function validItems(value: unknown): value is CartItem[] {
  return Array.isArray(value) && value.every((item) => item && typeof item === "object" &&
    typeof item.cartKey === "string" && typeof item.catalogItemId === "string" &&
    Number.isInteger(item.quantity) && item.quantity > 0);
}

export function saveGuestCheckoutIntent(items: CartItem[]): void {
  if (typeof window === "undefined" || !items.length) return;
  try { sessionStorage.setItem(KEY, JSON.stringify({ version: 1, createdAt: Date.now(), items } satisfies GuestCheckoutIntent)); } catch { /* storage is optional */ }
}

/** Consumes a short-lived, explicit guest checkout hand-off exactly once. */
export function takeGuestCheckoutIntent(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!raw) return [];
    const intent = JSON.parse(raw) as Partial<GuestCheckoutIntent>;
    return intent.version === 1 && typeof intent.createdAt === "number" && Date.now() - intent.createdAt >= 0 && Date.now() - intent.createdAt <= MAX_AGE_MS && validItems(intent.items)
      ? intent.items : [];
  } catch { return []; }
}

/** Same-cart compositions merge, distinct customizations remain distinct. */
export function mergeCartItems(existing: CartItem[], incoming: CartItem[]): CartItem[] {
  const merged = new Map(existing.map((item) => [item.cartKey, { ...item }]));
  for (const item of incoming) {
    const current = merged.get(item.cartKey);
    if (!current) { merged.set(item.cartKey, { ...item }); continue; }
    const quantity = current.quantity + item.quantity;
    merged.set(item.cartKey, { ...current, quantity, totalCents: current.unitPriceCents * quantity });
  }
  return [...merged.values()];
}
