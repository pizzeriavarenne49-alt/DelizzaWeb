/**
 * Order service — calls WLHORIZON Cloud Functions.
 *
 * **SECURITY NOTE:**
 *   Clients MUST NOT send totalCents/subtotalCents to the server.
 *   Only send productId, quantity, options.
 *   The server recalculates all amounts based on authoritative source.
 *
 * Cloud Functions deployed in europe-west1:
 *   - validateAndCalculateOrder
 *   - createOrder
 *   - createPaymentIntent
 *   - getAvailableSlots
 */

import { httpsCallable } from "firebase/functions";
import { getClientFunctions } from "@/config/firebase-client";
import type { CartItem, SelectedOption } from "@/types/cart";
import type { FulfillmentData } from "@/types/order";

// ─── Types ────────────────────────────────────────────────────────────────

/**
 * Minimal order item for validation.
 * Client sends ONLY: productId, quantity, options.
 * Server recalculates unit price + tax.
 */
export interface ValidateOrderItemInput {
  productId: string;
  quantity: number;
  selectedOptions?: SelectedOption[];
}

/**
 * Validation request — security boundary.
 * Client MUST NOT send any price data.
 */
export interface ValidateOrderInput {
  appId: string;
  items: ValidateOrderItemInput[];
}

/**
 * Server response after validation & calculation.
 * These amounts are authoritative — the client must not override them.
 */
export interface ValidateOrderResult {
  /** Sum of (product.price_cents * qty) for all items */
  subtotalCents: number;
  /** Sum of taxes (computed per item based on tax_rate_bps) */
  taxCents: number;
  /** Total = subtotal + tax (this MUST match Stripe PaymentIntent amount) */
  totalCents: number;
  /** Item-level data with server-calculated prices (for order record) */
  items: CartItem[];
}

/**
 * Create order request.
 * Only sent AFTER validateAndCalculateOrder confirms prices.
 */
export interface CreateOrderParams {
  appId: string;
  userId: string;
  userEmail: string;
  items: CartItem[]; // Server-validated items from ValidateOrderResult
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  fulfillmentData: FulfillmentData;
  paymentMethod: string;
  // idempotencyKey added by the function
}

export interface CreateOrderResult {
  success: boolean;
  orderId: string;
  orderNumber: string;
  paymentIntentId: string;
}

/**
 * Create payment intent request.
 * Amount is recalculated server-side, never trusted from client.
 */
export interface CreatePaymentIntentParams {
  appId: string;
  orderId: string;
  // Client MUST NOT send amountCents — it's calculated server-side
}

export interface CreatePaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  amountCents: number; // Server-calculated, authoritative
}

// ─── Cloud Function calls ──────────────────────────────────────────────────

/**
 * Validate order items and recalculate all prices server-side.
 *
 * This is the SECURITY BOUNDARY:
 *   - Client sends only: productId, quantity, selectedOptions
 *   - Server fetches fresh prices from authoritative source
 *   - Server returns validated CartItem[] with correct prices
 *   - Client MUST use these items for checkout, not the local cart
 *
 * If prices mismatch (e.g., price changed, product disabled), server returns error.
 */
export async function validateAndCalculateOrder(
  params: ValidateOrderInput,
): Promise<ValidateOrderResult> {
  const functions = getClientFunctions();
  const callable = httpsCallable(functions, "validateAndCalculateOrder");
  const result = await callable(params);
  return result.data as ValidateOrderResult;
}

/**
 * Create order in Firestore (status: "draft").
 *
 * Must be called AFTER validateAndCalculateOrder.
 * Items MUST be the server-validated items returned from validation.
 *
 * Returns orderId and paymentIntentId (will be updated by createPaymentIntent).
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
 * Create Stripe PaymentIntent for an order.
 *
 * The server:
 *   1. Fetches the order from Firestore
 *   2. Recalculates totalCents from order.items to ensure security
 *   3. Creates PaymentIntent with this recalculated amount
 *   4. Stores paymentIntentId in the order
 *   5. Returns clientSecret for frontend Stripe integration
 *
 * The amount is NEVER sent by the client.
 */
export async function createPaymentIntent(
  params: CreatePaymentIntentParams,
): Promise<CreatePaymentIntentResult> {
  const functions = getClientFunctions();
  const callable = httpsCallable(functions, "createPaymentIntent");
  const result = await callable(params);
  return result.data as CreatePaymentIntentResult;
}
