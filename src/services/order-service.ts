/**
 * Order service — calls the same WLHORIZON Cloud Functions as the Flutter app.
 *
 * Cloud Functions are deployed in europe-west1:
 *   - createOrder
 *   - createPaymentIntent
 */

import { httpsCallable } from "firebase/functions";
import { getClientFunctions } from "@/config/firebase-client";
import type { CartItem } from "@/types/cart";
import type { FulfillmentData } from "@/types/order";

export interface CreateOrderParams {
  appId: string;
  userId: string;
  userEmail: string;
  items: CartItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  fulfillmentData: FulfillmentData;
  paymentId: string;
  paymentMethod: string;
}

export interface CreateOrderResult {
  success: boolean;
  orderId: string;
  orderNumber: string;
}

export interface CreatePaymentIntentParams {
  appId: string;
  orderId: string;
}

export interface CreatePaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  amountCents: number;
}

/**
 * Calls the WLHORIZON `createOrder` Cloud Function.
 * Mirrors the Flutter ClientOrderService.createOrder() payload exactly.
 */
export async function createOrder(
  params: CreateOrderParams,
): Promise<CreateOrderResult> {
  const functions = getClientFunctions();
  const callable = httpsCallable(functions, "createOrder");
  const idempotencyKey = `web_${params.userId}_${Date.now()}_${globalThis.crypto.randomUUID().slice(0, 8)}`;
  const result = await callable({ ...params, idempotencyKey });
  return result.data as CreateOrderResult;
}

/**
 * Calls the WLHORIZON `createPaymentIntent` Cloud Function.
 * Returns the Stripe clientSecret — amount is server-calculated (never trust client).
 */
export async function createPaymentIntent(
  params: CreatePaymentIntentParams,
): Promise<CreatePaymentIntentResult> {
  const functions = getClientFunctions();
  const callable = httpsCallable(functions, "createPaymentIntent");
  const result = await callable(params);
  return result.data as CreatePaymentIntentResult;
}
