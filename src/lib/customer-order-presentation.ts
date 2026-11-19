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

export interface CustomerOrderTracking {
  phase: "validated" | "preparing" | "ready" | "completed" | "cancelled" | "pending";
  title: string;
  description: string;
  step: -1 | 0 | 1 | 2 | 3;
  terminal: boolean;
}

/** Kitchen status is authoritative. Payment validation remains a separate contract. */
export function getCustomerOrderTracking(order: CustomerOrderPresentationInput): CustomerOrderTracking {
  const presentation = getCustomerOrderPresentation(order);
  const status = normalizedStatus(order.status);
  // Full refunds use their own terminal order status; a payment flag alone can be partial.
  if (status === "refunded") {
    return { phase: "cancelled", title: "Commande remboursée", description: "Cette commande a été remboursée. Pour toute question, contactez Deli’Zza.", step: -1, terminal: true };
  }
  if (presentation.state === "cancelled") {
    return { phase: "cancelled", title: "Commande annulée", description: "Cette commande a été annulée. Pour toute question, contactez Deli’Zza.", step: -1, terminal: true };
  }
  if (status === "completed") {
    return { phase: "completed", title: "Commande récupérée", description: "Bon appétit et à bientôt !", step: 3, terminal: true };
  }
  if (status === "ready") {
    return { phase: "ready", title: "Prête à récupérer", description: "Vos pizzas vous attendent !", step: 2, terminal: false };
  }
  if (status === "inpreparation") {
    return { phase: "preparing", title: "En préparation", description: "Vos pizzas sont en préparation !", step: 1, terminal: false };
  }
  if (presentation.state === "validated") {
    return { phase: "validated", title: "Commande validée", description: "Nous avons bien reçu votre commande.", step: 0, terminal: false };
  }
  return { phase: "pending", title: "Confirmation en cours", description: "Nous attendons la confirmation de votre commande. Le suivi se met à jour automatiquement : ne payez pas une deuxième fois.", step: -1, terminal: false };
}
