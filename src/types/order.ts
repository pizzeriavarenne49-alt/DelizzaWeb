/**
 * Order types — aligned with WLHORIZON Flutter app.
 *
 * Mirrors:
 *   - lib/domain/order/order_status.dart  → OrderStatus
 *   - lib/domain/order/fulfillment.dart   → FulfillmentMethod, FulfillmentData
 *   - lib/domain/order/order.dart         → OrderData
 */

import type { CartItem } from "./cart";

/** Mirrors WLHORIZON OrderStatus enum */
export type OrderStatus =
  | "draft"
  | "created"
  | "paid"
  | "accepted"
  | "inPreparation"
  | "ready"
  | "completed"
  | "cancelled";

/** Mirrors WLHORIZON FulfillmentMethod enum */
export type FulfillmentMethod = "clickAndCollect" | "delivery" | "onSite";

export type PaymentTiming = "before" | "after" | "flexible";

interface BaseFulfillmentData {
  method: FulfillmentMethod;
  isAsap?: boolean;
  isPaid: boolean;
  source?: string;
  scheduledTime?: string;
  slotDate?: string;
  timeSlot?: string;
  serviceOpeningId?: string;
  slotId?: string;
  requestedPickupAt?: string;
  pickupAt?: string;
  instructions?: string;
}

export type FulfillmentData =
  | (BaseFulfillmentData & {
      method: "clickAndCollect";
      paymentTiming: PaymentTiming;
    })
  | (BaseFulfillmentData & {
      method: Exclude<FulfillmentMethod, "clickAndCollect">;
      paymentTiming?: PaymentTiming;
    });

/** Mirrors the pickup option structure returned by WLHORIZON Capacity V2 previews. */
export interface TimeSlotInfo {
  start: string;
  end: string;
  service: string;
  remainingUnits: number;
  remainingOrders: number;
  status: "available" | "limited" | "full";
}

/** Firestore timestamp — can be a Firestore Timestamp, a plain Date, or a unix millis number */
export type FirestoreTimestamp = { toDate(): Date; seconds: number; nanoseconds: number } | Date | number | null;

/** Mirrors the order document structure in the `orders` Firestore collection */
export interface OrderData {
  id: string;
  appId: string;
  orderNumber: string;
  status: OrderStatus;
  items: CartItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  fulfillmentMethod: FulfillmentMethod;
  fulfillmentData: FulfillmentData;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}
