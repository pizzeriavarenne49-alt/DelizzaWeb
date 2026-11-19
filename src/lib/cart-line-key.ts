import type { CartItemCustomizations } from "@/types/cart";

function orderedChoices(choices: Record<string, string[]> = {}) {
  return Object.keys(choices).sort()
    .filter(id => Array.isArray(choices[id]) && choices[id].length > 0)
    .map(id => [id, [...choices[id]].sort()]);
}

/** Ingredient and option IDs are opaque and may themselves contain separators. */
export function buildCartKey(productId: string, selected: Partial<CartItemCustomizations>): string {
  return JSON.stringify([
    "product", productId,
    orderedChoices(selected.selectedTemplateOptions),
    orderedChoices(selected.selectedLegacyOptions),
    [...(selected.addedSupplements ?? [])].sort(),
    [...(selected.removedIngredients ?? [])].sort(),
  ]);
}
