/**
 * Order service — calls the same WLHORIZON Cloud Functions as the Flutter app.
 *
 * Cloud Functions are deployed in europe-west1:
 *   - createOrder
 *   - createPaymentIntent
 */

import { httpsCallable } from "firebase/functions";
import { getClientFunctions } from "@/config/firebase-client";
import type { FulfillmentData } from "@/types/order";
import type { PizzaDuoOrderSelection } from "@/types/cart";

export interface CreateOrderItem {
  catalogItemId: string;
  quantity: number;
  formulaId?: string;
  formulaStepChoices?: Record<string, string[]>;
  selectedTemplateOptions?: Record<string, string[]>;
  selectedLegacyOptions?: Record<string, string[]>;
  addedSupplements?: string[];
  removedIngredients?: string[];
  recipeBaseOverride?: "tomate" | "crème";
  /** One physical Pizza Duo. Its recipes are validated and snapshotted server-side. */
  duo?: PizzaDuoOrderSelection;
}

export interface CreateOrderParams {
  appId: string;
  userId: string;
  userEmail: string;
  items: CreateOrderItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  fulfillmentData: FulfillmentData;
  paymentId: string;
  paymentMethod: string;
  source?: "web";
  idempotencyKey: string;
  customerName?: string;
  customerPhone?: string;
  legalAcceptance?: {
    termsVersion: string;
    privacyVersion: string;
    acceptedAt: string;
    origin: "web";
    uid: string;
  };
  rewardItemIndex?: number;
}

export interface CreateOrderResult {
  success: boolean;
  orderId: string;
  orderNumber: string;
  status?: string;
  idempotent?: boolean;
}

export interface CreatePaymentIntentParams {
  appId: string;
  orderId: string;
}

export interface CreatePaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  transactionId?: string;
  amountCents: number;
  currency?: string;
  status?: string;
  idempotent?: boolean;
}
export interface CreateDemoPaymentIntentResult extends Omit<CreatePaymentIntentResult, "clientSecret"> { clientSecret: null; simulated: true; }

export interface CompleteDemoPaymentParams { appId: "d_lizza"; orderId: string; paymentIntentId: string; }
export interface CompleteDemoPaymentResult { success: boolean; orderId: string; status?: string; }

/**
 * Calls the WLHORIZON `createOrder` Cloud Function.
 * Mirrors the Flutter ClientOrderService.createOrder() payload exactly.
 */
export async function createOrder(
  params: CreateOrderParams,
): Promise<CreateOrderResult> {
  const functions = getClientFunctions();
  const callable = httpsCallable(functions, "createOrder");
  const result = await callable(params);
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

/** Strict emulator-only counterpart; the server independently enforces every
 * local-demo guard and derives the amount from the stored order. */
export async function createDemoPaymentIntent(params: CreatePaymentIntentParams): Promise<CreateDemoPaymentIntentResult> {
  const result = await httpsCallable(getClientFunctions(), "createDemoPaymentIntent")(params);
  return result.data as CreateDemoPaymentIntentResult;
}

/** Exists only behind the browser and Functions demo-emulator gates. */
export async function completeDemoPayment(params: CompleteDemoPaymentParams): Promise<CompleteDemoPaymentResult> {
  const result = await httpsCallable(getClientFunctions(), "completeDemoPayment")(params);
  return result.data as CompleteDemoPaymentResult;
}
