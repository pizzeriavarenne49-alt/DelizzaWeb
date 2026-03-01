/** Core domain types */

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: string;
  badge?: string;
  active: boolean;
  isPopular: boolean;
  tags: string[];
}

export interface Category {
  id: string;
  label: string;
  icon?: string;
}

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  badge: string;
  price: number;
  ctaLabel: string;
  active: boolean;
  order: number;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  image: string;
  code: string;
  discount: string;
  validUntil: string;
  startAt: string;
  endAt: string;
}

/** Detected platform for smart redirects */
export type Platform = "ios" | "android" | "desktop";
