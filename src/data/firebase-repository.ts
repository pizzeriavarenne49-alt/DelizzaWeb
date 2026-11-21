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
import { isPublicProductDoc } from "@/lib/catalog-publication";
import { getPizzaDuoRecipeBase, isDelizzaPizzaCategory, PIZZA_DUO_CATALOG_ID, PIZZA_DUO_CATEGORY_ID } from "@/lib/pizza-duo";
import { INGREDIENT_CATEGORY_LABELS } from "@/types";
import type { Product, Category, HeroSlide, Offer, ProductIngredient, IngredientCategory } from "@/types";
import type { ProductOption, OptionChoice, OptionType } from "@/types/product-options";
import type { DataRepository } from "@/data/repository";
import { sortHomepageFeaturedProducts } from "@/lib/homepage-promotion";
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
  return Array.isArray(v) ? v.filter((entry): entry is string => typeof entry === "string") : [];
}

function optBool(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}

function money(raw: unknown): { amountCents: number; currency: string } {
  if (typeof raw !== "object" || raw === null) {
    return { amountCents: 0, currency: "EUR" };
  }
  const value = raw as Record<string, unknown>;
  return {
    amountCents: typeof value.amountCents === "number" ? value.amountCents : 0,
    currency: str(value.currency, "EUR"),
  };
}

function parseTemplatePriceOverrides(raw: unknown): Record<string, Record<string, number>> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).map(([templateId, choices]) => {
      if (typeof choices !== "object" || choices === null || Array.isArray(choices)) {
        return [templateId, {}];
      }
      return [
        templateId,
        Object.fromEntries(
          Object.entries(choices as Record<string, unknown>)
            .filter((entry): entry is [string, number] => typeof entry[1] === "number")
        ),
      ];
    }),
  );
}

function isPublicCategoryDoc(data: FirestoreDoc): boolean {
  const active = bool(data.isActive, true);
  if (!active) return false;

  if (optBool(data.visible) === false) return false;
  if (optBool(data.published) === false) return false;
  if (optBool(data.public) === false) return false;
  if (optBool(data.isVisible) === false) return false;
  if (optBool(data.hidden) === true) return false;
  if (optBool(data.archived) === true) return false;
  if (optBool(data.isArchived) === true) return false;
  if (optBool(data.deleted) === true) return false;
  if (optBool(data.isDeleted) === true) return false;

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
              return {
                id: str(ch.id),
                name: str(ch.name),
                priceModifier: money(ch.priceModifier),
                isActive: bool(ch.isActive, false),
                ...(ch.absolutePrice ? { absolutePrice: money(ch.absolutePrice) } : {}),
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
        pricingMode: o.pricingMode === "absolute" ? "absolute" : "delta",
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
          return {
            id: str(ch.id),
            name: str(ch.name),
            priceModifier: money(ch.priceModifier),
            isActive: bool(ch.isActive, false),
            ...(ch.absolutePrice ? { absolutePrice: money(ch.absolutePrice) } : {}),
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
    pricingMode: data.pricingMode === "absolute" ? "absolute" : "delta",
  };
}

function mapIngredient(id: string, data: FirestoreDoc): ProductIngredient {
  const category = str(data.category);
  return {
    id,
    appId: str(data.appId),
    name: str(data.name),
    emoji: str(data.emoji),
    defaultPriceModifier: money(data.defaultPriceModifier),
    isActive: bool(data.isActive, true),
    category: Object.hasOwn(INGREDIENT_CATEGORY_LABELS, category) ? category as IngredientCategory : "autre",
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

function toPublicOffer(offer: FirestoreOffer): Offer {
  return {
    id: offer.id,
    title: offer.title,
    content: offer.content,
    image: offer.image,
    start_at: offer.start_at,
    end_at: offer.end_at,
    active: offer.active,
  };
}

function normalizeOffers(offers: FirestoreOffer[]): Offer[] {
  return offers
    .filter(isOfferActive)
    .sort(sortOffers)
    .map(toPublicOffer);
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
    badge: bool(data.isNew, false) ? "Nouveau" : typeof data.badge === "string" ? data.badge : undefined,
    active: bool(data.isActive, true),
    manualOutOfStock: bool(data.manualOutOfStock, false),
    stockManaged: bool(data.stockManaged, false),
    stockQty: typeof data.stockQty === "number" && Number.isFinite(data.stockQty)
      ? data.stockQty
      : undefined,
    is_popular: bool(data.isPopular, false),
    tags: arr(data.tags),
    options: parseOptions(data.options),
    legacyOptionIds: parseOptions(data.options).map((option) => option.id),
    baseIngredientIds: arr(data.baseIngredientIds),
    availableSupplementIds: arr(data.availableSupplementIds),
    ...(Array.isArray(data.pizzaDuoSupplementIds)
      ? { pizzaDuoSupplementIds: arr(data.pizzaDuoSupplementIds) }
      : {}),
    ...(typeof data.usePizzaCommonSupplements === "boolean"
      ? { usePizzaCommonSupplements: data.usePizzaCommonSupplements }
      : {}),
    allowIngredientRemoval: bool(data.allowIngredientRemoval, false),
    appliedTemplateIds: parseTemplateIds(data.appliedTemplateIds),
    templatePriceOverrides: parseTemplatePriceOverrides(data.templatePriceOverrides),
    ingredientLibrary: [],
    kind: data.kind === "pizza_duo" ? "pizza_duo" : undefined,
    recipeBase: getPizzaDuoRecipeBase(str(data.categoryId), data.recipeBase),
    pizzaUnits: data.pizzaUnits === 0 || data.pizzaUnits === 1 ? data.pizzaUnits : undefined,
    homepageFeatured: bool(data.homepageFeatured, false),
    homepageOrder: num(data.homepageOrder, 0),
    isNew: bool(data.isNew, false),
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
    // Homepage selection is opt-in. An empty selection deliberately hides the
    // whole section instead of inventing a carousel from popular products.
    const featured = sortHomepageFeaturedProducts(await this.getProducts());
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
    let pizzaCommonSupplementIds: string[] | undefined;
    let tenantAppData: Record<string, unknown> | undefined;
    if (WL_APP_ID === "d_lizza") {
      try {
        const appDoc = await getDb().collection("wl_apps").doc(WL_APP_ID).get();
        tenantAppData = appDoc.data();
        if (Array.isArray(tenantAppData?.pizzaCommonSupplementIds)) {
          pizzaCommonSupplementIds = arr(tenantAppData.pizzaCommonSupplementIds);
        }
      } catch (error) {
        console.warn("[CMS] Pizza supplement policy unavailable; keeping per-product policy.", error);
      }
    }
    const snap = await getDb()
      .collection("wl_catalog_items")
      .where("appId", "==", WL_APP_ID)
      .where("isActive", "==", true)
      .get();

    const rawProducts = snap.docs
      .map((doc) => ({ id: doc.id, data: doc.data() }))
      .filter(({ data }) => isPublicProductDoc(data))
      .filter(({ data }) => data.kind !== "pizza_duo")
      .map(({ id, data }) => mapProduct(id, data));

    // The canonical Duo stays deliberately private for POS. It is projected
    // into the public server response only when this tenant explicitly opens
    // its independent web channel. Browser Firestore rules never need to
    // expose the private parent document.
    if (WL_APP_ID === "d_lizza") {
      try {
        const duoDoc = await getDb().collection("wl_catalog_items").doc(PIZZA_DUO_CATALOG_ID).get();
        const duo = duoDoc.data();
        const categoryDoc = typeof duo?.categoryId === "string"
          ? await getDb().collection("wl_catalog_categories").doc(duo.categoryId).get()
          : null;
        const category = categoryDoc?.data();
        const validDuoCategory = category?.appId === WL_APP_ID && category?.isActive === true &&
          (categoryDoc?.id === PIZZA_DUO_CATEGORY_ID
            ? isPublicCategoryDoc(category)
            : ["base tomate", "base crème", "base creme"].includes(str(category.name).trim().toLocaleLowerCase("fr")));
        if (tenantAppData?.pizzaDuoWebEnabled === true && duoDoc.exists && duo &&
          duo.appId === WL_APP_ID && duo.kind === "pizza_duo" && duo.isActive === false && duo.visible === false &&
          duo.price?.amountCents === 1490 && String(duo.price?.currency ?? "EUR").toUpperCase() === "EUR" &&
          duo.pizzaUnits === 1 && duo.manualOutOfStock !== true && validDuoCategory &&
          !["hidden", "archived", "isArchived", "deleted", "isDeleted"].some((field) => duo[field] === true)) {
          rawProducts.push(mapProduct(duoDoc.id, { ...duo, isActive: true, visible: true }));
        }
      } catch (error) {
        console.warn("[CMS] Pizza Duo web contract unavailable; omitting the private product.", error);
      }
    }

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

    const allIngredientIds = [
      ...new Set(rawProducts.flatMap((p) => [
        ...p.baseIngredientIds,
        ...p.availableSupplementIds,
        ...(p.pizzaDuoSupplementIds ?? []),
        ...(pizzaCommonSupplementIds ?? []),
      ])),
    ];

    const ingredientMap = new Map<string, ProductIngredient>();
    if (allIngredientIds.length > 0) {
      const db = getDb();
      const chunks: string[][] = [];
      for (let i = 0; i < allIngredientIds.length; i += 30) {
        chunks.push(allIngredientIds.slice(i, i + 30));
      }
      const ingredientSnaps = await Promise.all(
        chunks.map((chunk) =>
          db
            .collection("wl_ingredient_library")
            .where("appId", "==", WL_APP_ID)
            .where(FieldPath.documentId(), "in", chunk)
            .get()
        )
      );
      ingredientSnaps
        .flatMap((s) => s.docs)
        .forEach((doc) => {
          const ingredient = mapIngredient(doc.id, doc.data());
          ingredientMap.set(doc.id, ingredient);
        });
    }

    // Merge template-derived options (first) with inline options and resolved ingredients.
    return rawProducts.map((product) => {
      const usesCommonPizzaSupplements = pizzaCommonSupplementIds !== undefined &&
        product.usePizzaCommonSupplements !== false && product.pizzaUnits === 1 &&
        product.kind !== "pizza_duo" && isDelizzaPizzaCategory(product.category);
      const effectiveSupplementIds = usesCommonPizzaSupplements
        ? pizzaCommonSupplementIds!
        : product.availableSupplementIds;
      const templateOptions = product.appliedTemplateIds
        .map((id) => templateMap.get(id))
        .filter((opt): opt is ProductOption => opt !== undefined);
      const ingredientLibrary = [
        ...new Set([
          ...product.baseIngredientIds,
          ...effectiveSupplementIds,
          ...(product.pizzaDuoSupplementIds ?? []),
          ...(product.kind === "pizza_duo" ? pizzaCommonSupplementIds ?? [] : []),
        ]),
      ]
        .map((id) => ingredientMap.get(id))
        .filter((ingredient): ingredient is ProductIngredient => ingredient !== undefined);
      return {
        ...product,
        availableSupplementIds: effectiveSupplementIds,
        ...(product.kind === "pizza_duo" && pizzaCommonSupplementIds !== undefined
          ? { pizzaCommonSupplementIds }
          : {}),
        options: [...templateOptions, ...product.options],
        ingredientLibrary,
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
