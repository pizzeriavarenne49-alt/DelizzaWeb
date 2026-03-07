/**
 * FirebaseRepository — reads catalog data from Firestore (WLHORIZON collections).
 *
 * Collections:
 *   wl_catalog_categories  — menu categories
 *   wl_catalog_items       — menu products / items
 *
 * Hero slides and offers don't exist in WLHORIZON Firestore; they are
 * delegated to mock data (same as MockRepository).
 */

import type { Product, Category, HeroSlide, Offer } from "@/types";
import type { DataRepository } from "@/data/repository";
import { buildFeaturedProducts } from "@/data/repository";
import { getDb, WL_APP_ID, FIREBASE_STORAGE_BUCKET } from "@/config/firebase";
import {
  categories as mockCategories,
  products as mockProducts,
  heroSlides as mockHeroSlides,
  offers as mockOffers,
} from "@/data/mock";

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

/** Filter offers by active status + date window */
function filterActiveOffers(offers: Offer[]): Offer[] {
  const now = new Date();
  return offers.filter((o) => {
    if (!o.active) return false;
    if (o.start_at && new Date(o.start_at) > now) return false;
    if (o.end_at && new Date(o.end_at) < now) return false;
    return true;
  });
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

function mapProduct(id: string, data: FirestoreDoc): Product {
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
    is_popular: bool(data.isPopular, false),
    tags: arr(data.tags),
  };
}

// ---------------------------------------------------------------------------
// FirebaseRepository
// ---------------------------------------------------------------------------

export class FirebaseRepository implements DataRepository {
  /** Hero slides don't exist in WLHORIZON Firestore — delegate to mock */
  async getHomeHeroSlides(): Promise<HeroSlide[]> {
    return mockHeroSlides
      .filter((s) => s.active)
      .sort((a, b) => a.order - b.order);
  }

  async getFeaturedProducts(): Promise<Product[]> {
    return buildFeaturedProducts(await this.getProducts());
  }

  async getCategories(): Promise<Category[]> {
    const snap = await getDb()
      .collection("wl_catalog_categories")
      .where("appId", "==", WL_APP_ID)
      .where("isActive", "==", true)
      .orderBy("order")
      .get();

    return snap.docs.map((doc) => mapCategory(doc.id, doc.data()));
  }

  async getProducts(): Promise<Product[]> {
    const snap = await getDb()
      .collection("wl_catalog_items")
      .where("appId", "==", WL_APP_ID)
      .where("isActive", "==", true)
      .get();

    return snap.docs.map((doc) => mapProduct(doc.id, doc.data()));
  }

  async getPopularProducts(): Promise<Product[]> {
    const all = await this.getProducts();
    return all.filter((p) => p.is_popular);
  }

  /** Offers don't exist in WLHORIZON Firestore — delegate to mock */
  async getOffers(): Promise<Offer[]> {
    return filterActiveOffers(mockOffers);
  }
}

// Re-export for convenience
export { mockCategories, mockProducts };
