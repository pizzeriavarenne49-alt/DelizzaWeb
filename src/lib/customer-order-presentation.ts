export type CustomerOrderPresentationState =
  | "validated"
  | "cancelled"
  | "hiddenTemporary";

export interface CustomerOrderPresentationInput {
  status?: unknown;
  paymentStatus?: unknown;
  productionAuthorized?: unknown;
  fulfillmentData?: unknown;
  paidTotalCents?: unknown;
}

export interface CustomerOrderPresentation {
  state: CustomerOrderPresentationState;
  label: "Validée" | "Annulée" | "Paiement en cours de validation";
}

function normalizedStatus(value: unknown): string {
  return typeof value === "string"
    ? value.trim().replace(/[-_\s]/g, "").toLowerCase()
    : "";
}

function positiveNumber(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function fulfillmentIsPaid(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  return (value as { isPaid?: unknown }).isPaid === true;
}

export function getCustomerOrderPresentation(
  order: CustomerOrderPresentationInput,
): CustomerOrderPresentation {
  const status = normalizedStatus(order.status);
  const paymentStatus = normalizedStatus(order.paymentStatus);

  const isCancelled =
    ["cancelled", "canceled", "expired", "voided", "void"].includes(status);

  if (isCancelled) {
    return { state: "cancelled", label: "Annulée" };
  }

  const isValidated =
    ["paid", "accepted", "inpreparation", "ready", "completed"].includes(status) ||
    order.productionAuthorized === true ||
    ["paid", "refunded"].includes(paymentStatus) ||
    fulfillmentIsPaid(order.fulfillmentData) ||
    positiveNumber(order.paidTotalCents);

  if (isValidated) {
    return { state: "validated", label: "Validée" };
  }

  return {
    state: "hiddenTemporary",
    label: "Paiement en cours de validation",
  };
}

export function isVisibleInCustomerHistory(
  order: CustomerOrderPresentationInput,
): boolean {
  return getCustomerOrderPresentation(order).state !== "hiddenTemporary";
}
