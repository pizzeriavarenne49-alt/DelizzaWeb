import type { CartItem } from "@/types/cart";
import type { FulfillmentData, TimeSlotInfo } from "@/types/order";

export const PICKUP_SLOT_UNAVAILABLE_MESSAGE =
  "Ce créneau vient d'être réservé par un autre client. Choisissez un nouvel horaire.";

type CartItemWithFormulaPreview = CartItem & {
  formulaId?: unknown;
  formulaStepChoices?: unknown;
};

export interface PreviewCartItem {
  catalogItemId: string;
  quantity: number;
  formulaId?: string;
  formulaStepChoices?: Record<string, string[]>;
}

export interface ProductionAllocationPreview {
  allocationId: string;
  slotId: string;
  serviceOpeningId: string;
  startAt: string;
  endAt: string;
  units: number;
}

export interface ContinuousPickupWindowPreview {
  slotId: string;
  serviceOpeningId: string;
  serviceDate?: string;
  pickupAt: string;
  productionStartAt: string | null;
  productionEndAt: string | null;
  totalPizzaUnits: number;
  productionAllocations: ProductionAllocationPreview[];
}

export interface OnlineOrderingPreviewState {
  status: "open" | "closed" | "emergency";
  updatedAt?: unknown;
  effectiveAt?: unknown;
  serviceOpeningId?: string | null;
  serviceDate?: string | null;
  publicReason?: string | null;
}

export interface ContinuousPickupPreviewResponse {
  capacityVersion: 2;
  basis: "server_cart" | "staff_estimate";
  reservationStatus: "preview_only";
  totalPizzaUnits: number;
  generatedAt: string;
  windows: ContinuousPickupWindowPreview[];
  onlineOrdering?: OnlineOrderingPreviewState;
}

export interface ScheduledPickupOption extends TimeSlotInfo {
  slotDate: string;
  serviceOpeningId: string;
  slotId: string;
  pickupAt: string;
  requestedPickupAt: string;
  productionStartAt: string | null;
  productionEndAt: string | null;
  totalPizzaUnits: number;
  productionSlotIds: string[];
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string" && entry.length > 0);
}

function readFormulaStepChoices(value: unknown): Record<string, string[]> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

  const choices: Record<string, string[]> = {};
  for (const [stepId, productIds] of Object.entries(value)) {
    if (typeof stepId !== "string" || stepId.length === 0 || !isStringArray(productIds)) {
      return undefined;
    }
    choices[stepId] = productIds;
  }
  return choices;
}

export function buildPreviewCartItems(items: CartItem[]): PreviewCartItem[] {
  return items.map((item) => {
    const source = item as CartItemWithFormulaPreview;
    const previewItem: PreviewCartItem = {
      catalogItemId: item.catalogItemId,
      quantity: item.quantity,
    };

    if (typeof source.formulaId === "string" && source.formulaId.length > 0) {
      previewItem.formulaId = source.formulaId;
      const formulaStepChoices = readFormulaStepChoices(source.formulaStepChoices);
      if (formulaStepChoices) {
        previewItem.formulaStepChoices = formulaStepChoices;
      }
    }

    return previewItem;
  });
}

function parseIsoDate(value: string, fieldName: string): Date {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid ISO date`);
  }
  return parsed;
}

function getParisParts(value: string): { date: string; time: string } {
  const date = parseIsoDate(value, "pickupAt");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = values.hour === "24" ? "00" : values.hour;
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${hour}:${values.minute}`,
  };
}

function getServiceKeyFromOpeningId(appId: string, serviceDate: string, serviceOpeningId: string): string {
  const prefix = `${appId}_${serviceDate}_`;
  if (!serviceOpeningId.startsWith(prefix)) {
    throw new Error("serviceOpeningId does not match appId and slotDate");
  }

  const serviceKey = serviceOpeningId.slice(prefix.length);
  if (!serviceKey) {
    throw new Error("serviceOpeningId does not include a service key");
  }
  return serviceKey;
}

export function mapPreviewWindowToScheduledOption({
  appId,
  requestedDate,
  window,
}: {
  appId: string;
  requestedDate: string;
  window: ContinuousPickupWindowPreview;
}): ScheduledPickupOption {
  const pickup = getParisParts(window.pickupAt);
  if (pickup.date !== requestedDate) {
    throw new Error("pickupAt does not belong to the requested Europe/Paris service date");
  }

  const allocations = window.productionAllocations;
  let serviceOpeningId: string;
  let slotId: string;
  let productionSlotIds: string[];
  let startTime: string;

  if (Array.isArray(allocations) && allocations.length > 0) {
    serviceOpeningId = allocations[0].serviceOpeningId;
    if (!serviceOpeningId) {
      throw new Error("preview allocation is missing serviceOpeningId");
    }
    if (allocations.some((allocation) => allocation.serviceOpeningId !== serviceOpeningId)) {
      throw new Error("preview window crosses service openings");
    }

    const firstAllocation = allocations[0];
    const lastAllocation = allocations[allocations.length - 1];
    const start = getParisParts(firstAllocation.startAt);
    if (start.date !== requestedDate) {
      throw new Error("production allocation does not belong to the requested Europe/Paris service date");
    }
    slotId = lastAllocation.slotId;
    productionSlotIds = allocations.map((allocation) => allocation.slotId);
    startTime = start.time;
  } else if (window.totalPizzaUnits === 0) {
    serviceOpeningId = window.serviceOpeningId;
    slotId = window.slotId;
    if (!serviceOpeningId || !slotId) {
      throw new Error("zero-unit preview window is missing slot identity");
    }
    if (window.serviceDate && window.serviceDate !== requestedDate) {
      throw new Error("preview window serviceDate does not match requested date");
    }
    productionSlotIds = [];
    startTime = pickup.time;
  } else {
    throw new Error("preview window is missing production allocations");
  }

  if (!serviceOpeningId) {
    throw new Error("preview window is missing serviceOpeningId");
  }

  const end = pickup;
  const service = getServiceKeyFromOpeningId(appId, requestedDate, serviceOpeningId);

  return {
    start: startTime,
    end: end.time,
    service,
    remainingUnits: 1,
    remainingOrders: 1,
    status: "available",
    slotDate: requestedDate,
    serviceOpeningId,
    slotId,
    pickupAt: window.pickupAt,
    requestedPickupAt: window.pickupAt,
    productionStartAt: window.productionStartAt,
    productionEndAt: window.productionEndAt,
    totalPizzaUnits: window.totalPizzaUnits,
    productionSlotIds,
  };
}

export function mapPreviewResponseToScheduledOptions({
  appId,
  requestedDate,
  response,
}: {
  appId: string;
  requestedDate: string;
  response: ContinuousPickupPreviewResponse;
}): ScheduledPickupOption[] {
  if (response.capacityVersion !== 2 || response.basis !== "server_cart") {
    throw new Error("preview response is not a cart capacity V2 response");
  }
  if (!Array.isArray(response.windows)) {
    throw new Error("preview response windows must be an array");
  }

  return response.windows
    .map((window) => mapPreviewWindowToScheduledOption({ appId, requestedDate, window }))
    .sort((left, right) => left.pickupAt.localeCompare(right.pickupAt));
}

export function isSameScheduledPickupOption(
  left: Pick<ScheduledPickupOption, "pickupAt" | "serviceOpeningId" | "slotId">,
  right: Pick<ScheduledPickupOption, "pickupAt" | "serviceOpeningId" | "slotId">,
): boolean {
  return (
    left.pickupAt === right.pickupAt &&
    left.serviceOpeningId === right.serviceOpeningId &&
    left.slotId === right.slotId
  );
}

export function buildScheduledFulfillmentDataFromPickupOption({
  slot,
  instructions,
  source = "web",
}: {
  slot: ScheduledPickupOption;
  instructions?: string;
  source?: string;
}): FulfillmentData & {
  slotDate: string;
  timeSlot: string;
  serviceOpeningId: string;
  slotId: string;
  scheduledTime: string;
  requestedPickupAt: string;
  pickupAt: string;
} {
  return {
    method: "clickAndCollect",
    isAsap: false,
    isPaid: false,
    source,
    paymentTiming: "before",
    scheduledTime: slot.end,
    timeSlot: `${slot.start}-${slot.end}`,
    slotDate: slot.slotDate,
    serviceOpeningId: slot.serviceOpeningId,
    slotId: slot.slotId,
    requestedPickupAt: slot.requestedPickupAt,
    pickupAt: slot.pickupAt,
    ...(instructions ? { instructions } : {}),
  };
}
