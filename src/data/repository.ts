/**
 * Data repository — stable API consumed by pages.
 *
 * Implementations (priority order):
 *  1. FirebaseRepository  (reads from Firestore — same data as WLHORIZON app)
 *  2. DirectusRepository  (reads from Directus REST API)
 *  3. MockRepository      (local mock data, final fallback)
 *
 * The exported `repo` singleton auto-selects the first available source:
 *   FIREBASE_PROJECT_ID + WL_APP_ID  → Firebase
 *   NEXT_PUBLIC_DIRECTUS_URL          → Directus
 *   (none)                            → Mock
 */

import type { Product, Category, HeroSlide, Offer } from "@/types";
// HeroSlide kept for DirectusRepository which still maps hero_slides from CMS

/** Virtual "Populaire" category prepended to the list from CMS */
export const POPULAR_CATEGORY: Category = {
  id: "popular",
  name: "Populaire",
  slug: "populaire",
  order: -1,
  active: true,
  icon: "🔥",
};

// ---------------------------------------------------------------------------
// Repository interface
// ---------------------------------------------------------------------------

export interface DataRepository {
  getHomeHeroSlides(): Promise<HeroSlide[]>;
  getFeaturedProducts(): Promise<Product[]>;
  getCategories(): Promise<Category[]>;
  getProducts(): Promise<Product[]>;
  getPopularProducts(): Promise<Product[]>;
  getOffers(): Promise<Offer[]>;
}

// ---------------------------------------------------------------------------
// Shared helper
// ---------------------------------------------------------------------------

/** Build the featured product list: badge+image first, then image-only, max 5 */
export function buildFeaturedProducts(all: Product[]): Product[] {
  const seenIds = new Set<string>();
  const badged = all.filter(p => p.badge && p.image && !p.image.includes('placeholder'));
  const withImage = all.filter(p => p.image && !p.image.includes('placeholder'));
  const featured: Product[] = [];
  for (const p of badged) {
    seenIds.add(p.id);
    featured.push(p);
    if (featured.length >= 5) return featured;
  }
  for (const p of withImage) {
    if (!seenIds.has(p.id)) {
      featured.push(p);
      if (featured.length >= 5) break;
    }
  }
  return featured;
}

// ---------------------------------------------------------------------------
// Directus implementation
// ---------------------------------------------------------------------------

import {
  DIRECTUS_URL,
  FETCH_TIMEOUT_MS,
  REVALIDATE,
  fetchOptions,
  assetUrl,
} from "@/config/cms";

/** Raw Directus REST response wrapper */
interface DirectusResponse<T> {
  data: T;
}

async function directusFetch<T>(
  path: string,
  revalidate: number,
): Promise<T> {
  if (!DIRECTUS_URL) throw new Error("DIRECTUS_URL not set");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${DIRECTUS_URL}${path}`, {
      ...fetchOptions(revalidate),
      signal: controller.signal,
      headers: {
        ...(process.env.DIRECTUS_STATIC_TOKEN
          ? { Authorization: `Bearer ${process.env.DIRECTUS_STATIC_TOKEN}` }
          : {}),
      },
    });
    if (!res.ok) throw new Error(`Directus ${res.status}: ${res.statusText}`);
    const json: DirectusResponse<T> = await res.json();
    return json.data;
  } finally {
    clearTimeout(timer);
  }
}

const PLACEHOLDER_IMAGE = "/images/placeholder.svg";

/** Raw record from Directus REST API */
type DirectusRecord = Record<string, unknown>;

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function num(v: unknown, fallback = 0): number {
  return typeof v === "number" ? v : fallback;
}
function bool(v: unknown): boolean {
  return v === true;
}
function arr(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}

function mapProduct(raw: DirectusRecord): Product {
  return {
    id: str(raw.id),
    name: str(raw.name),
    slug: str(raw.slug),
    description_short: str(raw.description_short),
    ingredients: arr(raw.ingredients),
    price_cents: num(raw.price_cents),
    image: raw.image ? assetUrl(str(raw.image), { width: 600, fit: "cover" }) : PLACEHOLDER_IMAGE,
    category: str(raw.category),
    badge: raw.badge ? str(raw.badge) : undefined,
    active: bool(raw.active),
    is_popular: bool(raw.is_popular),
    tags: arr(raw.tags),
  };
}

function mapCategory(raw: DirectusRecord): Category {
  return {
    id: str(raw.id),
    name: str(raw.name),
    slug: str(raw.slug),
    order: num(raw.order),
    active: bool(raw.active),
    icon: raw.icon ? str(raw.icon) : undefined,
  };
}

function mapHeroSlide(raw: DirectusRecord): HeroSlide {
  return {
    id: str(raw.id),
    title: str(raw.title),
    subtitle: raw.subtitle ? str(raw.subtitle) : null,
    image: raw.image ? assetUrl(str(raw.image), { width: 1200, fit: "cover" }) : PLACEHOLDER_IMAGE,
    badge: raw.badge ? str(raw.badge) : null,
    price_cents: typeof raw.price_cents === "number" ? raw.price_cents : null,
    cta_label: str(raw.cta_label, "Commander"),
    cta_target: str(raw.cta_target, "/go?trigger=hero_cta"),
    active: bool(raw.active),
    order: num(raw.order),
  };
}

function mapOffer(raw: DirectusRecord): Offer {
  return {
    id: str(raw.id),
    title: str(raw.title),
    content: str(raw.content),
    image: raw.image ? assetUrl(str(raw.image), { width: 800, fit: "cover" }) : null,
    start_at: raw.start_at ? str(raw.start_at) : null,
    end_at: raw.end_at ? str(raw.end_at) : null,
    active: bool(raw.active),
  };
}

/** Filter offers by active + date window */
function filterActiveOffers(offers: Offer[]): Offer[] {
  const now = new Date();
  return offers.filter((o) => {
    if (!o.active) return false;
    if (o.start_at && new Date(o.start_at) > now) return false;
    if (o.end_at && new Date(o.end_at) < now) return false;
    return true;
  });
}

class DirectusRepository implements DataRepository {
  async getHomeHeroSlides(): Promise<HeroSlide[]> {
    const raw = await directusFetch<DirectusRecord[]>(
      "/items/home_hero_slides?filter[active][_eq]=true&sort=order",
      REVALIDATE.home,
    );
    return raw.map(mapHeroSlide);
  }

  async getFeaturedProducts(): Promise<Product[]> {
    return buildFeaturedProducts(await this.getProducts());
  }

  async getCategories(): Promise<Category[]> {
    const raw = await directusFetch<DirectusRecord[]>(
      "/items/categories?filter[active][_eq]=true&sort=order",
      REVALIDATE.menu,
    );
    return raw.map(mapCategory);
  }

  async getProducts(): Promise<Product[]> {
    const raw = await directusFetch<DirectusRecord[]>(
      "/items/products?filter[active][_eq]=true&limit=-1",
      REVALIDATE.menu,
    );
    return raw.map(mapProduct);
  }

  async getPopularProducts(): Promise<Product[]> {
    const raw = await directusFetch<DirectusRecord[]>(
      "/items/products?filter[active][_eq]=true&filter[is_popular][_eq]=true&limit=-1",
      REVALIDATE.menu,
    );
    return raw.map(mapProduct);
  }

  async getOffers(): Promise<Offer[]> {
    const raw = await directusFetch<DirectusRecord[]>(
      "/items/offers?filter[active][_eq]=true",
      REVALIDATE.offers,
    );
    return filterActiveOffers(raw.map(mapOffer));
  }
}

// ---------------------------------------------------------------------------
// Mock implementation (fallback)
// ---------------------------------------------------------------------------

import {
  categories as mockCategories,
  products as mockProducts,
  heroSlides as mockHeroSlides,
  offers as mockOffers,
} from "@/data/mock";

class MockRepository implements DataRepository {
  async getHomeHeroSlides(): Promise<HeroSlide[]> {
    return mockHeroSlides
      .filter((s) => s.active)
      .sort((a, b) => a.order - b.order);
  }

  async getFeaturedProducts(): Promise<Product[]> {
    return buildFeaturedProducts(mockProducts.filter((p) => p.active));
  }

  async getCategories(): Promise<Category[]> {
    return mockCategories.filter((c) => c.active).sort((a, b) => a.order - b.order);
  }

  async getProducts(): Promise<Product[]> {
    return mockProducts.filter((p) => p.active);
  }

  async getPopularProducts(): Promise<Product[]> {
    return mockProducts.filter((p) => p.active && p.is_popular);
  }

  async getOffers(): Promise<Offer[]> {
    return filterActiveOffers(mockOffers);
  }
}

// ---------------------------------------------------------------------------
// Singleton with fallback
// ---------------------------------------------------------------------------

import { FirebaseRepository } from "./firebase-repository";

/** Detect which data source is active for logging purposes */
let activeSource: "firebase" | "directus" | "mock" = "mock";

function createRepository(): DataRepository {
  // Priority 1: Firebase (same data as WLHORIZON mobile app)
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.WL_APP_ID
  ) {
    activeSource = "firebase";
    console.info("[CMS] Using Firebase (WLHORIZON) as data source");
    return new FirebaseRepository();
  }
  // Priority 2: Directus (standalone CMS)
  if (DIRECTUS_URL) {
    activeSource = "directus";
    console.info("[CMS] Using Directus as data source");
    return new DirectusRepository();
  }
  // Priority 3: Mock data
  activeSource = "mock";
  console.warn("[CMS] No data source configured — using mock data");
  return new MockRepository();
}

export const repo: DataRepository = createRepository();

/**
 * Safe wrapper: calls the primary repo and falls back to mock on error.
 * Used in pages to guarantee resilience.
 */
export async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
): Promise<T> {
  try {
    return await primary();
  } catch (err) {
    console.warn(
      `[CMS] Primary source (${activeSource}) unavailable, using mock fallback:`,
      err instanceof Error ? err.message : err,
    );
    return fallback();
  }
}

const mockRepo = new MockRepository();

export { mockRepo };