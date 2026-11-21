import { getDb, getStorageBucket, WL_APP_ID } from "@/config/firebase";
import type { Product } from "@/types";
import {
  isCurrentHomepagePromotion,
  isSafeHomepagePromotionImage,
  normalizePublishedHomepagePromotion,
  type HomepagePromotion,
  type PublishedPromotionInput,
} from "@/lib/homepage-promotion";

export type { HomepagePromotion } from "@/lib/homepage-promotion";

/**
 * Only the published variant is visible to the public server render. A draft
 * can be freely edited by the WLHORIZON admin without leaking its contents.
 */
export async function getPublishedHomepagePromotion(products: Product[]): Promise<HomepagePromotion | null> {
  if (WL_APP_ID !== "d_lizza") return null;
  const db = getDb();
  const [doc, appDoc] = await Promise.all([
    db.collection("wl_website_homepages").doc(WL_APP_ID).get(),
    db.collection("wl_apps").doc(WL_APP_ID).get(),
  ]);
  const published = doc.data()?.published as PublishedPromotionInput | null | undefined;
  if (!published) return null;
  const requestedProductId = typeof published.productId === "string" ? published.productId : null;
  const privateDuo = requestedProductId === "d_lizza_pizza_duo_comptoir"
    ? await getDb().collection("wl_catalog_items").doc(requestedProductId).get()
    : null;
  const duo = privateDuo?.data();
  const privatePrice = duo?.price as { amountCents?: unknown } | undefined;
  const duoAvailableAtCounter = appDoc.data()?.pizzaDuoPosEnabled === true &&
    duo?.posDuoActive === true && duo.manualOutOfStock !== true;
  const normalized = normalizePublishedHomepagePromotion(
    published,
    products,
    typeof privatePrice?.amountCents === "number" ? privatePrice.amountCents : null,
    duoAvailableAtCounter,
  );
  if (!normalized || normalized.visual.kind === "duo") return normalized;
  const file = getStorageBucket().file(normalized.visual.imageVersion);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [metadata] = await file.getMetadata();
  if (metadata.contentType !== "image/jpeg" || Number(metadata.size) <= 0) return null;
  return normalized;
}

export async function getPizzaDuoWebEnabled(): Promise<boolean> {
  if (WL_APP_ID !== "d_lizza") return false;
  const app = await getDb().collection("wl_apps").doc(WL_APP_ID).get();
  return app.data()?.pizzaDuoWebEnabled === true;
}

export async function isCurrentPublishedPromotionImage(path: string): Promise<boolean> {
  if (!isSafeHomepagePromotionImage(path) || WL_APP_ID !== "d_lizza") return false;
  const doc = await getDb().collection("wl_website_homepages").doc(WL_APP_ID).get();
  const published = doc.data()?.published as PublishedPromotionInput | null | undefined;
  return Boolean(published && published.useDuoCover !== true && isCurrentHomepagePromotion(published) && published.imagePath === path);
}
