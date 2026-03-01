/**
 * Data repository — stable API consumed by pages.
 *
 * Implementations:
 *  - DirectusRepository (reads from Directus REST API)
 *  - MockRepository     (local mock data, fallback)
 *
 * The exported `repo` singleton auto-selects Directus when
 * NEXT_PUBLIC_DIRECTUS_URL is set, otherwise falls back to mock.
 */

import type { Product, Category, HeroSlide, Offer } from "@/types";

// ---------------------------------------------------------------------------
// Repository interface
// ---------------------------------------------------------------------------

export interface DataRepository {
  getHomeHeroSlides(): Promise<HeroSlide[]>;
  getCategories(): Promise<Category[]>;
  getProducts(): Promise<Product[]>;
  getPopularProducts(): Promise<Product[]>;
  getOffers(): Promise<Offer[]>;
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

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapProduct(raw: any): Product {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    description_short: raw.description_short ?? "",
    ingredients: raw.ingredients ?? [],
    price_cents: raw.price_cents,
    image: raw.image ? assetUrl(raw.image, { width: 600, fit: "cover" }) : "/images/placeholder.svg",
    category: raw.category,
    badge: raw.badge ?? undefined,
    active: raw.active,
    is_popular: raw.is_popular,
    tags: raw.tags ?? [],
  };
}

function mapCategory(raw: any): Category {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    order: raw.order,
    active: raw.active,
    icon: raw.icon ?? undefined,
  };
}

function mapHeroSlide(raw: any): HeroSlide {
  return {
    id: raw.id,
    title: raw.title,
    subtitle: raw.subtitle ?? null,
    image: raw.image ? assetUrl(raw.image, { width: 1200, fit: "cover" }) : "/images/placeholder.svg",
    badge: raw.badge ?? null,
    price_cents: raw.price_cents ?? null,
    cta_label: raw.cta_label ?? "Commander",
    cta_target: raw.cta_target ?? "/go?trigger=hero_cta",
    active: raw.active,
    order: raw.order,
  };
}

function mapOffer(raw: any): Offer {
  return {
    id: raw.id,
    title: raw.title,
    content: raw.content ?? "",
    image: raw.image ? assetUrl(raw.image, { width: 800, fit: "cover" }) : null,
    start_at: raw.start_at ?? null,
    end_at: raw.end_at ?? null,
    active: raw.active,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

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
    const raw = await directusFetch<any[]>(
      "/items/home_hero_slides?filter[active][_eq]=true&sort=order",
      REVALIDATE.home,
    );
    return raw.map(mapHeroSlide);
  }

  async getCategories(): Promise<Category[]> {
    const raw = await directusFetch<any[]>(
      "/items/categories?filter[active][_eq]=true&sort=order",
      REVALIDATE.menu,
    );
    return raw.map(mapCategory);
  }

  async getProducts(): Promise<Product[]> {
    const raw = await directusFetch<any[]>(
      "/items/products?filter[active][_eq]=true&limit=-1",
      REVALIDATE.menu,
    );
    return raw.map(mapProduct);
  }

  async getPopularProducts(): Promise<Product[]> {
    const raw = await directusFetch<any[]>(
      "/items/products?filter[active][_eq]=true&filter[is_popular][_eq]=true&limit=-1",
      REVALIDATE.menu,
    );
    return raw.map(mapProduct);
  }

  async getOffers(): Promise<Offer[]> {
    const raw = await directusFetch<any[]>(
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

function createRepository(): DataRepository {
  if (DIRECTUS_URL) {
    return new DirectusRepository();
  }
  console.warn("[CMS] NEXT_PUBLIC_DIRECTUS_URL not set — using mock data");
  return new MockRepository();
}

export const repo: DataRepository = createRepository();

/**
 * Safe wrapper: calls the Directus repo and falls back to mock on error.
 * Used in pages to guarantee resilience.
 */
export async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
): Promise<T> {
  try {
    return await primary();
  } catch (err) {
    console.warn("[CMS] Directus unavailable, using mock fallback:", err);
    return fallback();
  }
}

const mockRepo = new MockRepository();

export { mockRepo };
