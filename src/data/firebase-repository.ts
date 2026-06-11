/**
 * FirebaseRepository — reads catalog data from Firestore (WLHORIZON collections).
 *
 * Collections:
 *   wl_catalog_categories  — menu categories
 *   wl_catalog_items       — menu products / items
 *   wl_option_templates    — reusable option templates (e.g. pizza sizes)
 *   wl_offers              — commercial offers / promotions
 *
 * Hero slides still come from shared mock data. Offers now read from the
 * dedicated WLHORIZON collection.
 */

import { FieldPath } from "firebase-admin/firestore";
import type { Product, Category, HeroSlide, Offer } from "@/types";
import type { ProductOption, OptionChoice, OptionType } from "@/types/product-options";
import type { DataRepository } from "@/data/repository";
import { buildFeaturedProducts } from "@/data/repository";
import { getDb, WL_APP_ID, FIREBASE_STORAGE_BUCKET } from "@/config/firebase";
import {
  categories as mockCategories,
  products as mockProducts,
  heroSlides as mockHeroSlides,
} from "@/data/mock";

const FEATURED_PRODUCTS_DEBUG = process.env.FEATURED_PRODUCTS_DEBUG === "1";

function logFeaturedProductsSelection(
  source: "firebase",
  scope: string,
  products: Product[],
): void {
  if (!FEATURED_PRODUCTS_DEBUG) return;

  console.info(
    `[CMS][featured] source=${source} scope=${scope} count=${products.length}`,
    products.map((p) => ({
      id: p.id,
      name: p.name,
      active: p.active,
      is_popular: p.is_popular,
      category: p.category,
      price_cents: p.price_cents,
      image: p.image,
      badge: p.badge ?? null,
    })),
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a URL-friendly slug from a display name */
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "item";
}

/** Resolve a Firebase Storage image URL from imagePath or imageUrl */
function resolveImage(
  imagePath?: string | null,
  imageUrl?: string | null,
): string {
  if (imageUrl) return imageUrl;
  if (imagePath && FIREBASE_STORAGE_BUCKET) {
    return `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(imagePath)}?alt=media`;
  }
  return "/images/placeholder.svg";
}

/** Extract a string from an unknown Firestore field value */
function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function num(v: unknown, fallback = 0): number {
  return typeof v === "number" ? v : fallback;
}
function bool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}
function arr(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}

function optBool(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}

function isExplicitlyHidden(v: unknown): boolean {
  return v === true;
}

function isPublicCategoryDoc(data: FirestoreDoc): boolean {
  const active = bool(data.isActive, true);
  if (!active) return false;

  if (isExplicitlyHidden(data.visible)) return false;
  if (isExplicitlyHidden(data.published)) return false;
  if (isExplicitlyHidden(data.public)) return false;
  if (isExplicitlyHidden(data.isVisible)) return false;
  if (isExplicitlyHidden(data.archived)) return false;
  if (isExplicitlyHidden(data.isArchived)) return false;
  if (isExplicitlyHidden(data.deleted)) return false;
  if (isExplicitlyHidden(data.isDeleted)) return false;

  return true;
}

function isPublicProductDoc(data: FirestoreDoc): boolean {
  const active = bool(data.isActive, true);
  if (!active) return false;

  if (optBool(data.visible) === false) return false;
  if (optBool(data.published) === false) return false;
  if (optBool(data.public) === false) return false;
  if (optBool(data.isVisible) === false) return false;
  if (optBool(data.archived) === true) return false;
  if (optBool(data.isArchived) === true) return false;
  if (optBool(data.deleted) === true) return false;
  if (optBool(data.isDeleted) === true) return false;

  const categoryId = str(data.categoryId);
  if (!categoryId) return false;

  const priceObj = data.price as Record<string, unknown> | undefined;
  const priceCents =
    typeof priceObj?.amountCents === "number"
      ? priceObj.amountCents
      : num(data.priceCents);
  if (!(priceCents > 0)) return false;

  return true;
}

function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const parsed = Number(v);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toDate(v: unknown): Date | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  if (typeof v === "string" || typeof v === "number") {
    const parsed = new Date(v);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof v === "object" && v !== null && "toDate" in v) {
    const candidate = v as { toDate?: unknown };
    if (typeof candidate.toDate === "function") {
      try {
        const parsed = candidate.toDate();
        return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

function toIsoDate(v: unknown): string | null {
  return toDate(v)?.toISOString() ?? null;
}

function firstString(data: FirestoreDoc, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value;
    }
  }
  return fallback;
}

function firstBool(data: FirestoreDoc, keys: string[], fallback = false): boolean {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "boolean") {
      return value;
    }
  }
  return fallback;
}

function firstNumber(data: FirestoreDoc, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = data[key];
    const parsed = toNumber(value, Number.NaN);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function firstDate(data: FirestoreDoc, keys: string[]): string | null {
  for (const key of keys) {
    const value = toIsoDate(data[key]);
    if (value) {
      return value;
    }
  }
  return null;
}

function resolveOfferImage(data: FirestoreDoc): string | null {
  const url = firstString(data, ["imageUrl", "bannerImageUrl", "coverUrl"]);
  if (url) return url;

  const rawPath = firstString(data, [
    "imagePath",
    "bannerImagePath",
    "coverPath",
    "image",
  ]);
  if (!rawPath) return null;
  if (/^https?:\/\//i.test(rawPath)) return rawPath;
  if (rawPath.startsWith("/")) return rawPath;
  if (FIREBASE_STORAGE_BUCKET) {
    return `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(rawPath)}?alt=media`;
  }
  return null;
}

/** Parse a raw Firestore options array into typed ProductOption[] */
function parseOptions(raw: unknown): ProductOption[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[])
    .map((opt): ProductOption | null => {
      if (typeof opt !== "object" || opt === null) return null;
      const o = opt as Record<string, unknown>;
      const choices: OptionChoice[] = Array.isArray(o.choices)
        ? (o.choices as unknown[])
            .map((c): OptionChoice | null => {
              if (typeof c !== "object" || c === null) return null;
              const ch = c as Record<string, unknown>;
              const modifier =
                typeof ch.priceModifier === "object" && ch.priceModifier !== null
                  ? (ch.priceModifier as Record<string, unknown>)
                  : undefined;
              return {
                id: str(ch.id),
                name: str(ch.name),
                priceModifier: {
                  amountCents: typeof modifier?.amountCents === "number" ? modifier.amountCents : 0,
                  currency: str(modifier?.currency, "EUR"),
                },
                isActive: bool(ch.isActive, false),
              };
            })
            .filter((c): c is OptionChoice => c !== null)
            .filter((c) => c.isActive)
        : [];
      return {
        id: str(o.id),
        name: str(o.name),
        type: (o.type === "single" || o.type === "multiple") ? (o.type as OptionType) : "single",
        required: bool(o.required, false),
        choices,
        order: num(o.order, 0),
      };
    })
    .filter((opt): opt is ProductOption => opt !== null)
    .sort((a, b) => a.order - b.order);
}

/** Parse appliedTemplateIds from a Firestore document field */
function parseTemplateIds(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return (v as unknown[]).filter((id): id is string => typeof id === "string");
}

/** Convert a raw Firestore wl_option_templates document into a ProductOption */
function mapTemplateToOption(id: string, data: FirestoreDoc, order: number): ProductOption {
  const choices: OptionChoice[] = Array.isArray(data.choices)
    ? (data.choices as unknown[])
        .map((c): OptionChoice | null => {
          if (typeof c !== "object" || c === null) return null;
          const ch = c as Record<string, unknown>;
          const modifier =
            typeof ch.priceModifier === "object" && ch.priceModifier !== null
              ? (ch.priceModifier as Record<string, unknown>)
              : undefined;
          return {
            id: str(ch.id),
            name: str(ch.name),
            priceModifier: {
              amountCents: typeof modifier?.amountCents === "number" ? modifier.amountCents : 0,
              currency: str(modifier?.currency, "EUR"),
            },
            isActive: bool(ch.isActive, false),
          };
        })
        .filter((c): c is OptionChoice => c !== null)
        .filter((c) => c.isActive)
    : [];
  return {
    id,
    name: str(data.name),
    type: (data.type === "single" || data.type === "multiple") ? (data.type as OptionType) : "single",
    required: bool(data.required, false),
    choices,
    order,
  };
}

type FirestoreOffer = Offer & {
  sort_order: number;
  created_at_ms: number;
};

function mapOffer(id: string, data: FirestoreDoc): FirestoreOffer {
  return {
    id,
    title: firstString(data, ["title", "name", "label", "headline"], id),
    content: firstString(data, ["content", "description", "body", "summary"]),
    image: resolveOfferImage(data),
    start_at: firstDate(data, ["startAt", "start_at", "startsAt", "starts_at"]),
    end_at: firstDate(data, ["endAt", "end_at", "endsAt", "ends_at"]),
    active: firstBool(data, ["isActive", "active"], true),
    sort_order: firstNumber(data, ["order", "sortOrder", "sort_order"], 0),
    created_at_ms: toDate(data.createdAt ?? data.created_at)?.getTime() ?? 0,
  };
}

function isOfferActive(offer: Offer): boolean {
  const now = new Date();
  if (!offer.active) return false;
  if (offer.start_at && new Date(offer.start_at) > now) return false;
  if (offer.end_at && new Date(offer.end_at) < now) return false;
  return true;
}

function sortOffers(a: FirestoreOffer, b: FirestoreOffer): number {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  if (a.created_at_ms !== b.created_at_ms) return a.created_at_ms - b.created_at_ms;
  const aEnd = a.end_at ? new Date(a.end_at).getTime() : Number.POSITIVE_INFINITY;
  const bEnd = b.end_at ? new Date(b.end_at).getTime() : Number.POSITIVE_INFINITY;
  if (aEnd !== bEnd) return aEnd - bEnd;
  const titleDiff = a.title.localeCompare(b.title, "fr");
  if (titleDiff !== 0) return titleDiff;
  return a.id.localeCompare(b.id, "fr");
}

function normalizeOffers(offers: FirestoreOffer[]): Offer[] {
  return offers
    .filter(isOfferActive)
    .sort(sortOffers)
    .map(({ sort_order: _sortOrder, created_at_ms: _createdAtMs, ...offer }) => offer);
}

// ---------------------------------------------------------------------------
// Firestore document mappers
// ---------------------------------------------------------------------------

type FirestoreDoc = FirebaseFirestore.DocumentData;

function mapCategory(id: string, data: FirestoreDoc): Category {
  return {
    id,
    name: str(data.name),
    slug: str(data.slug) || slugify(str(data.name)),
    order: num(data.order),
    active: bool(data.isActive, true),
    icon: typeof data.icon === "string" ? data.icon : undefined,
  };
}

function mapProduct(id: string, data: FirestoreDoc): Product & { appliedTemplateIds: string[] } {
  // Price: prefer nested Money object, fall back to legacy flat field
  const priceObj = data.price as Record<string, unknown> | undefined;
  const priceCents =
    typeof priceObj?.amountCents === "number"
      ? priceObj.amountCents
      : num(data.priceCents);

  return {
    id,
    name: str(data.name),
    slug: str(data.slug) || slugify(str(data.name)),
    description_short: str(data.description),
    ingredients: arr(data.ingredients),
    price_cents: priceCents,
    tax_rate_bps: num(data.taxRateBps, 1000),
    image: resolveImage(
      data.imagePath as string | null,
      data.imageUrl as string | null,
    ),
    category: str(data.categoryId),
    badge: typeof data.badge === "string" ? data.badge : undefined,
    active: bool(data.isActive, true),
    manualOutOfStock: bool(data.manualOutOfStock, false),
    is_popular: bool(data.isPopular, false),
    tags: arr(data.tags),
    options: parseOptions(data.options),
    appliedTemplateIds: parseTemplateIds(data.appliedTemplateIds),
  };
}

// ---------------------------------------------------------------------------
// FirebaseRepository
// ---------------------------------------------------------------------------

export class FirebaseRepository implements DataRepository {
  /** Hero slides don't exist in WLHORIZON Firestore — return empty state in production. */
  async getHomeHeroSlides(): Promise<HeroSlide[]> {
    if (process.env.NODE_ENV === "production") {
      return [];
    }
    return mockHeroSlides
      .filter((s) => s.active)
      .sort((a, b) => a.order - b.order);
  }

  async getFeaturedProducts(): Promise<Product[]> {
    const featured = buildFeaturedProducts(await this.getPopularProducts());
    logFeaturedProductsSelection("firebase", `appId=${WL_APP_ID}`, featured);
    return featured;
  }

  async getCategories(): Promise<Category[]> {
    const snap = await getDb()
      .collection("wl_catalog_categories")
      .where("appId", "==", WL_APP_ID)
      .where("isActive", "==", true)
      .orderBy("order")
      .get();

    return snap.docs
      .map((doc) => ({ id: doc.id, data: doc.data() }))
      .filter(({ data }) => isPublicCategoryDoc(data))
      .map(({ id, data }) => mapCategory(id, data));
  }

  async getProducts(): Promise<Product[]> {
    const snap = await getDb()
      .collection("wl_catalog_items")
      .where("appId", "==", WL_APP_ID)
      .where("isActive", "==", true)
      .get();

    const rawProducts = snap.docs
      .map((doc) => ({ id: doc.id, data: doc.data() }))
      .filter(({ data }) => isPublicProductDoc(data))
      .map(({ id, data }) => mapProduct(id, data));

    // Collect all unique template IDs referenced across products
    const allTemplateIds = [
      ...new Set(rawProducts.flatMap((p) => p.appliedTemplateIds)),
    ];

    // Batch-fetch option templates (Firestore `in` query limit: 30 IDs per query)
    const templateMap = new Map<string, ProductOption>();
    if (allTemplateIds.length > 0) {
      const db = getDb();
      const chunks: string[][] = [];
      for (let i = 0; i < allTemplateIds.length; i += 30) {
        chunks.push(allTemplateIds.slice(i, i + 30));
      }
      const templateSnaps = await Promise.all(
        chunks.map((chunk) =>
          db
            .collection("wl_option_templates")
            .where("appId", "==", WL_APP_ID)
            .where(FieldPath.documentId(), "in", chunk)
            .get()
        )
      );
      templateSnaps
        .flatMap((s) => s.docs)
        .forEach((doc, index) => {
          templateMap.set(doc.id, mapTemplateToOption(doc.id, doc.data(), index));
        });
    }

    // Merge template-derived options (first) with any inline options
    return rawProducts.map(({ appliedTemplateIds, ...product }) => {
      const templateOptions = appliedTemplateIds
        .map((id) => templateMap.get(id))
        .filter((opt): opt is ProductOption => opt !== undefined);
      return {
        ...product,
        options: [...templateOptions, ...product.options],
      };
    });
  }

  async getPopularProducts(): Promise<Product[]> {
    const all = await this.getProducts();
    return all.filter((p) => p.is_popular);
  }

  /** Offers are stored in the dedicated wl_offers collection. */
  async getOffers(): Promise<Offer[]> {
    const snap = await getDb()
      .collection("wl_offers")
      .where("appId", "==", WL_APP_ID)
      .get();

    const rawOffers = snap.docs
      .map((doc) => ({ id: doc.id, data: doc.data() }))
      .filter(({ data }) => {
        const active = bool(data.isActive, true);
        if (!active) return false;
        if (optBool(data.visible) === false) return false;
        if (optBool(data.published) === false) return false;
        if (optBool(data.archived) === true) return false;
        if (optBool(data.deleted) === true) return false;
        return true;
      })
      .map(({ id, data }) => mapOffer(id, data));
    return normalizeOffers(rawOffers);
  }
}

// Re-export for convenience
export { mockCategories, mockProducts };
