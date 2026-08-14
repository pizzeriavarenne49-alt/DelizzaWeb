import { httpsCallable } from "firebase/functions";
import { getClientFunctions } from "@/config/firebase-client";
import { ensureDelizzaCustomerSession } from "@/services/customer-session";
import {
  buildPreviewCartItems,
  mapPreviewResponseToScheduledOptions,
  type ContinuousPickupPreviewResponse,
  type ScheduledPickupOption,
} from "@/lib/production-capacity-preview";
import type { CartItem } from "@/types/cart";

export interface PreviewScheduledPickupOptionsParams {
  appId: string;
  date: string;
  items: CartItem[];
}

export async function previewScheduledPickupOptions({
  appId,
  date,
  items,
}: PreviewScheduledPickupOptionsParams): Promise<ScheduledPickupOption[]> {
  await ensureDelizzaCustomerSession(true);

  const functions = getClientFunctions();
  const callable = httpsCallable(functions, "previewContinuousPickupWindows");
  const result = await callable({
    mode: "cart",
    appId,
    date,
    items: buildPreviewCartItems(items),
  });

  return mapPreviewResponseToScheduledOptions({
    appId,
    requestedDate: date,
    response: result.data as ContinuousPickupPreviewResponse,
  });
}
