/** Core domain types — aligned with Directus schema */

export interface Product {
  id: string;
  name: string;
  slug: string;
  description_short: string;
  ingredients: string[];
  price_cents: number;
  image: string;
  category: string; // category id
  badge?: string;
  active: boolean;
  is_popular: boolean;
  tags: string[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
  active: boolean;
  icon?: string;
}

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string | null;
  image: string;
  badge: string | null;
  price_cents: number | null;
  cta_label: string;
  cta_target: string;
  active: boolean;
  order: number;
}

export interface Offer {
  id: string;
  title: string;
  content: string;
  image: string | null;
  start_at: string | null;
  end_at: string | null;
  active: boolean;
}

/** Detected platform for smart redirects */
export type Platform = "ios" | "android" | "desktop";

/** Format price from cents to display string */
export function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2);
}
