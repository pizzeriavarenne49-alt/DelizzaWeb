"use client";

import type { CartItem } from "@/types/cart";
import type { FulfillmentData } from "@/types/order";

const STORAGE_KEY = "delizza_checkout_attempt_v1";

export interface CheckoutAttemptInput {
  appId: string;
  userId: string;
  items: CartItem[];
  fulfillmentData: FulfillmentData;
  customerName: string;
  customerPhone: string;
  useReward: boolean;
  rewardItemIndex?: number;
}

interface StoredAttempt {
  fingerprint: string;
  fingerprintVersion: 2;
  idempotencyKey: string;
  createdAt: number;
  updatedAt: number;
  orderId?: string;
}

function stableObject(value: Record<string, unknown>): Record<string, unknown> {
  return Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      const entry = value[key];
      if (entry !== undefined) acc[key] = stableValue(entry);
      return acc;
    }, {});
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return stableObject(value as Record<string, unknown>);
  }
  return value;
}

function hashString(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(16).padStart(8, "0")}${(h1 >>> 0).toString(16).padStart(8, "0")}`;
}

function optionalFulfillmentString<K extends keyof FulfillmentData>(
  fulfillmentData: FulfillmentData,
  key: K,
): FulfillmentData[K] | null {
  return key in fulfillmentData ? fulfillmentData[key] ?? null : null;
}

function readStoredAttempt(): StoredAttempt | null {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null") as StoredAttempt | null;
    if (!parsed?.fingerprint || !parsed.idempotencyKey || parsed.fingerprintVersion !== 2) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredAttempt(attempt: StoredAttempt): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
}

export function buildCheckoutAttemptFingerprint(input: CheckoutAttemptInput): string {
  const items = input.items
    .map((item) => {
      const formulaStepChoices = item.formulaStepChoices;
      const canonicalFormulaChoices =
        formulaStepChoices && typeof formulaStepChoices === "object" && !Array.isArray(formulaStepChoices)
          ? Object.fromEntries(
              Object.entries(formulaStepChoices)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([stepId, choices]) => [
                  stepId,
                  Array.isArray(choices)
                    ? choices.map((choice) => String(choice)).sort()
                    : [],
                ]),
            )
          : {};

      return stableValue({
        catalogItemId: item.catalogItemId,
        cartKey: item.cartKey,
        quantity: Number(item.quantity),
        unitPriceCents: Number(item.unitPriceCents),
        totalCents: Number(item.totalCents),
        taxRateBps: Number(item.taxRateBps),
        selectedOptions: (item.selectedOptions ?? [])
          .map((option) => stableValue({
            optionId: option.optionId,
            choiceIds: [...(option.choiceIds ?? [])].sort(),
            priceDeltaCents: Number(option.priceDeltaCents),
          }))
          .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
        formulaId: item.formulaId ?? null,
        formulaStepChoices: canonicalFormulaChoices,
      });
    })
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));

  const canonical = JSON.stringify(stableValue({
    appId: input.appId,
    userId: input.userId,
    items,
    fulfillmentData: {
      isAsap: input.fulfillmentData.isAsap === true,
      method: input.fulfillmentData.method ?? null,
      paymentTiming: input.fulfillmentData.paymentTiming ?? null,
      pickupAt: optionalFulfillmentString(input.fulfillmentData, "pickupAt"),
      requestedPickupAt: optionalFulfillmentString(input.fulfillmentData, "requestedPickupAt"),
      scheduledTime: input.fulfillmentData.scheduledTime ?? null,
      serviceOpeningId: optionalFulfillmentString(input.fulfillmentData, "serviceOpeningId"),
      slotDate: optionalFulfillmentString(input.fulfillmentData, "slotDate"),
      slotId: optionalFulfillmentString(input.fulfillmentData, "slotId"),
      source: input.fulfillmentData.source ?? null,
      timeSlot: optionalFulfillmentString(input.fulfillmentData, "timeSlot"),
    },
    customerNameHash: hashString(input.customerName.trim().toLocaleLowerCase("fr-FR")),
    customerPhoneHash: hashString(input.customerPhone.trim()),
    useReward: input.useReward,
    rewardItemIndex: input.rewardItemIndex ?? null,
  }));
  return `v2_${hashString(canonical)}`;
}

export function getOrCreateCheckoutAttempt(fingerprint: string): StoredAttempt {
  const existing = readStoredAttempt();
  if (existing?.fingerprint === fingerprint) return existing;

  const idempotencyKey = `web_${crypto.randomUUID()}`;
  const now = Date.now();
  const attempt = { fingerprint, fingerprintVersion: 2 as const, idempotencyKey, createdAt: now, updatedAt: now };
  writeStoredAttempt(attempt);
  return attempt;
}

export function rememberCheckoutAttemptOrder(fingerprint: string, orderId: string): void {
  const existing = readStoredAttempt();
  if (!existing || existing.fingerprint !== fingerprint) return;
  writeStoredAttempt({ ...existing, orderId, updatedAt: Date.now() });
}

export function clearCheckoutAttempt(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function clearCheckoutAttemptForOrder(orderId: string): void {
  const existing = readStoredAttempt();
  if (!existing || existing.orderId !== orderId) return;
  clearCheckoutAttempt();
}

export function getStoredCheckoutAttemptOrderId(): string | null {
  return readStoredAttempt()?.orderId ?? null;
}
