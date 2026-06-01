/**
 * Stripe webhook handler — validates payment & updates order status.
 *
 * POST /api/webhooks/stripe
 *
 * Env vars required:
 *   - STRIPE_WEBHOOK_SECRET (from Stripe Dashboard → Webhooks)
 *   - STRIPE_SECRET_KEY (for signature verification)
 *
 * Events handled:
 *   - payment_intent.succeeded → order status "draft" → "paid"
 *   - payment_intent.payment_failed → order status "draft" → "cancelled"
 *
 * Idempotence:
 *   - Uses event_id to prevent double-processing
 *   - Stores processed event IDs in order document
 *   - Verifies amount matches before updating status
 */

import { headers } from "next/headers";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import Stripe from "stripe";

// ─── Firebase initialization (server-side) ──────────────────────────────────
function getServerFirestore() {
  if (getApps().length > 0) {
    return getFirestore(getApp());
  }
  throw new Error("Firebase not initialized on server");
}

// ─── Webhook signature verification ────────────────────────────────────────
/**
 * Reconstruct the raw request body and verify Stripe signature.
 * Returns the parsed event if valid, null otherwise.
 */
async function verifyStripeSignature(
  body: string,
  signature: string | null | undefined,
): Promise<Stripe.Event | null> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET not set");
    return null;
  }

  if (!signature) {
    console.error("[webhook] Missing Stripe signature header");
    return null;
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: "2024-06-20",
    });

    const event = stripe.webhooks.constructEvent(body, signature, secret);
    return event as Stripe.Event;
  } catch (err) {
    console.error(
      "[webhook] Signature verification failed:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

// ─── Event processing ────────────────────────────────────────────────────────
/**
 * Process payment_intent.succeeded event.
 * Updates order status from "draft" → "paid".
 */
async function handlePaymentIntentSucceeded(
  event: Stripe.Event,
  paymentIntent: Stripe.PaymentIntent,
) {
  const orderId = paymentIntent.metadata?.orderId as string | undefined;
  if (!orderId) {
    console.warn(
      "[webhook] payment_intent.succeeded missing orderId in metadata",
    );
    return;
  }

  const db = getServerFirestore();
  const orderRef = doc(db, "orders", orderId);

  const orderSnap = await getDoc(orderRef);
  if (!orderSnap.exists()) {
    console.warn("[webhook] Order not found:", orderId);
    return;
  }

  const orderData = orderSnap.data();
  if (orderData.processedEvents?.includes(event.id)) {
    console.info("[webhook] Event already processed (idempotent):", event.id);
    return;
  }

  if (orderData.paymentIntentId !== paymentIntent.id) {
    console.error(
      "[webhook] PaymentIntent ID mismatch for order",
      orderId,
      "expected",
      orderData.paymentIntentId,
      "got",
      paymentIntent.id,
    );
    return;
  }

  if (orderData.totalCents !== paymentIntent.amount) {
    console.error(
      "[webhook] Amount mismatch for order",
      orderId,
      "expected",
      orderData.totalCents,
      "got",
      paymentIntent.amount,
    );
    return;
  }

  try {
    await updateDoc(orderRef, {
      status: "paid",
      updatedAt: new Date(),
      processedEvents: [...(orderData.processedEvents ?? []), event.id],
    });
    console.info(
      "[webhook] Order marked as paid:",
      orderId,
      "paymentIntentId:",
      paymentIntent.id,
    );
  } catch (err) {
    console.error(
      "[webhook] Failed to update order",
      orderId,
      ":",
      err instanceof Error ? err.message : err,
    );
    throw err;
  }
}

/**
 * Process payment_intent.payment_failed event.
 * Updates order status from "draft" → "cancelled".
 */
async function handlePaymentIntentFailed(
  event: Stripe.Event,
  paymentIntent: Stripe.PaymentIntent,
) {
  const orderId = paymentIntent.metadata?.orderId as string | undefined;
  if (!orderId) {
    console.warn(
      "[webhook] payment_intent.payment_failed missing orderId in metadata",
    );
    return;
  }

  const db = getServerFirestore();
  const orderRef = doc(db, "orders", orderId);

  const orderSnap = await getDoc(orderRef);
  if (!orderSnap.exists()) {
    console.warn("[webhook] Order not found:", orderId);
    return;
  }

  const orderData = orderSnap.data();
  if (orderData.processedEvents?.includes(event.id)) {
    console.info("[webhook] Event already processed (idempotent):", event.id);
    return;
  }

  if (orderData.status !== "draft") {
    console.warn(
      "[webhook] Order not in draft state, skipping cancel:",
      orderId,
      "status:",
      orderData.status,
    );
    return;
  }

  try {
    await updateDoc(orderRef, {
      status: "cancelled",
      updatedAt: new Date(),
      processedEvents: [...(orderData.processedEvents ?? []), event.id],
    });
    console.info("[webhook] Order cancelled:", orderId);
  } catch (err) {
    console.error(
      "[webhook] Failed to cancel order",
      orderId,
      ":",
      err instanceof Error ? err.message : err,
    );
    throw err;
  }
}

// ─── Next.js API route ──────────────────────────────────────────────────────
export async function POST(request: Request) {
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  const body = await request.text();

  const event = await verifyStripeSignature(body, signature);
  if (!event) {
    return new Response("Invalid signature", { status: 401 });
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentIntentSucceeded(event, paymentIntent);
    } else if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentIntentFailed(event, paymentIntent);
    } else {
      console.debug("[webhook] Unhandled event type:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(
      "[webhook] Error processing event:",
      err instanceof Error ? err.message : err,
    );
    return new Response("Internal server error", { status: 500 });
  }
}
