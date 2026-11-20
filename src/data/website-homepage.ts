import { getDb, WL_APP_ID } from "@/config/firebase";
import type { Product } from "@/types";

export type HomepagePromotionAction = "menu" | "product" | "counter";

export type HomepagePromotion = {
  title: string;
  description: string;
  buttonLabel: string;
  action: HomepagePromotionAction;
  productId: string | null;
  imageVersion: string;
  priceCents: number | null;
  counterOnly: boolean;
};

type PromotionRecord = {
  title?: unknown;
  description?: unknown;
  buttonLabel?: unknown;
  action?: unknown;
  productId?: unknown;
  imagePath?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
};

function string(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function date(value: unknown): Date | null {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  return value instanceof Date ? value : null;
}

function isCurrent(record: PromotionRecord, now = new Date()): boolean {
  const startsAt = date(record.startsAt);
  const endsAt = date(record.endsAt);
  return (!startsAt || startsAt <= now) && (!endsAt || endsAt > now);
}

function isSafePromotionImage(path: string | null): path is string {
  return path !== null && /^website\/d_lizza\/home-promo\/[a-z0-9][a-z0-9-]{0,79}\.jpg$/.test(path);
}

/**
 * Only the published variant is visible to the public server render. A draft
 * can be freely edited by the WLHORIZON admin without leaking its contents.
 */
export async function getPublishedHomepagePromotion(products: Product[]): Promise<HomepagePromotion | null> {
  if (WL_APP_ID !== "d_lizza") return null;
  const doc = await getDb().collection("wl_website_homepages").doc(WL_APP_ID).get();
  const published = doc.data()?.published as PromotionRecord | null | undefined;
  if (!published || !isCurrent(published)) return null;

  const title = string(published.title);
  const description = string(published.description);
  const buttonLabel = string(published.buttonLabel);
  const imagePath = string(published.imagePath);
  const action = published.action;
  if (!title || !description || !buttonLabel || !isSafePromotionImage(imagePath) ||
    (action !== "menu" && action !== "product" && action !== "counter")) return null;

  const requestedProductId = typeof published.productId === "string" ? published.productId : null;
  const selected = requestedProductId
    ? products.find((product) => product.id === published.productId)
    : undefined;
  const duo = requestedProductId === "d_lizza_pizza_duo_comptoir";
  const privateDuo = duo ? await getDb().collection("wl_catalog_items").doc(requestedProductId).get() : null;
  const privatePrice = privateDuo?.data()?.price as { amountCents?: unknown } | undefined;
  const priceCents = selected?.price_cents ??
    (typeof privatePrice?.amountCents === "number" ? privatePrice.amountCents : null);
  const webEnabled = Boolean(selected && duo);
  return {
    title,
    description,
    buttonLabel,
    action: duo && !webEnabled ? "counter" : action,
    productId: selected?.id ?? null,
    imageVersion: imagePath,
    priceCents,
    counterOnly: duo && !webEnabled,
  };
}

export async function getPizzaDuoWebEnabled(): Promise<boolean> {
  if (WL_APP_ID !== "d_lizza") return false;
  const app = await getDb().collection("wl_apps").doc(WL_APP_ID).get();
  return app.data()?.pizzaDuoWebEnabled === true;
}

export async function isCurrentPublishedPromotionImage(path: string): Promise<boolean> {
  if (!isSafePromotionImage(path) || WL_APP_ID !== "d_lizza") return false;
  const doc = await getDb().collection("wl_website_homepages").doc(WL_APP_ID).get();
  const published = doc.data()?.published as PromotionRecord | null | undefined;
  return Boolean(published && isCurrent(published) && string(published.imagePath) === path);
}
