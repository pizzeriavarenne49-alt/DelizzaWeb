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

export interface FulfillmentData {
  method: FulfillmentMethod;
  [key: string]: unknown;
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
