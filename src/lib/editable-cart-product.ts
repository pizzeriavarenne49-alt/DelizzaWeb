"use client";

import type { Product } from "@/types";

async function readJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) return null;
  return response.json() as Promise<T>;
}

/**
 * Reads the same enriched, public catalogue shape as the menu. This preserves
 * inline options, resolved templates, price overrides and ingredient labels
 * when a customer reopens a cart line from any route.
 */
export async function loadEditableCartProduct(catalogItemId: string): Promise<Product | null> {
  if (!catalogItemId || catalogItemId.includes("/")) return null;
  return readJson<Product>(`/api/catalog/editable-product/${encodeURIComponent(catalogItemId)}`);
}

/** Reads current, enriched and commercially available recipe data for Duo editing. */
export async function loadEditablePizzaDuoRecipes(): Promise<Product[]> {
  const recipes = await readJson<Product[]>("/api/catalog/editable-pizza-recipes");
  return Array.isArray(recipes) ? recipes : [];
}
