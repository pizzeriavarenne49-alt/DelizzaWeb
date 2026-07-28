import type { FulfillmentData, TimeSlotInfo } from "@/types/order";

export type SlotDateKey = "today" | "tomorrow";

export const PARIS_TIME_ZONE = "Europe/Paris";

export function formatParisDate(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PARIS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function shiftParisDate(dateKey: string, days: number): string {
  const base = new Date(`${dateKey}T12:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return formatParisDate(base);
}

export function getServiceDateForKey(dateKey: SlotDateKey, referenceDate: Date = new Date()): string {
  const today = formatParisDate(referenceDate);
  return dateKey === "today" ? today : shiftParisDate(today, 1);
}

export function buildServiceOpeningId(appId: string, serviceDate: string, serviceKey: string): string {
  return `${appId}_${serviceDate}_${serviceKey}`;
}

export function buildSlotId(serviceDate: string, slotStart: string): string {
  return `${serviceDate}_${slotStart}`;
}

export function formatSlotRange(slot: Pick<TimeSlotInfo, "start" | "end">): string {
  return `${slot.start}-${slot.end}`;
}

export function isSameSlot(
  left: Pick<TimeSlotInfo, "start" | "end" | "service">,
  right: Pick<TimeSlotInfo, "start" | "end" | "service">,
): boolean {
  return left.start === right.start && left.end === right.end && left.service === right.service;
}

export function buildScheduledFulfillmentData({
  appId,
  serviceDate,
  slot,
  instructions,
  source = "web",
}: {
  appId: string;
  serviceDate: string;
  slot: TimeSlotInfo;
  instructions?: string;
  source?: string;
}): FulfillmentData & {
  slotDate: string;
  timeSlot: string;
  serviceOpeningId: string;
  slotId: string;
  scheduledTime: string;
} {
  const timeSlot = formatSlotRange(slot);
  return {
    method: "clickAndCollect",
    isAsap: false,
    isPaid: false,
    source,
    paymentTiming: "before",
    scheduledTime: slot.start,
    timeSlot,
    slotDate: serviceDate,
    serviceOpeningId: buildServiceOpeningId(appId, serviceDate, slot.service),
    slotId: buildSlotId(serviceDate, slot.start),
    ...(instructions ? { instructions } : {}),
  };
}
