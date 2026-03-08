/** Core domain types — aligned with Directus schema */

import type { ProductOption } from "@/types/product-options";

export type { ProductOption };
export type { OptionChoice, OptionType } from "@/types/product-options";

export interface Product {
  id: string;
  name: string;
  slug: string;
  description_short: string;
  ingredients: string[];
  price_cents: number;
  /** Tax rate in basis points (e.g. 1000 = 10 %) */
  tax_rate_bps: number;
  image: string;
  category: string; // category id
  badge?: string;
  active: boolean;
  is_popular: boolean;
  tags: string[];
  /** Customization options (size, toppings, etc.) embedded in Firestore document */
  options: ProductOption[];
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

/** Compute TTC (tax-included) amount from HT cents and tax rate in basis points */
export function computeTtcCents(htCents: number, taxRateBps: number): number {
  return htCents + computeTaxCents(htCents, taxRateBps);
}

/** Compute tax amount from HT cents and tax rate in basis points */
export function computeTaxCents(htCents: number, taxRateBps: number): number {
  return Math.round(htCents * taxRateBps / 10000);
}

/** Format a tax rate in bps as a display percentage (e.g. 1000 → "10", 550 → "5,5") */
export function formatTaxRate(bps: number): string {
  const pct = bps / 100;
  return pct % 1 === 0 ? `${pct}` : `${pct.toFixed(1).replace(".", ",")}`;
}
