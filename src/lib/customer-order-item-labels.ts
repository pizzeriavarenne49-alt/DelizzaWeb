function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function name(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  const item = record(value);
  return item && typeof item.name === "string" && item.name.trim() ? item.name : null;
}

function ingredientNames(value: unknown): string[] {
  return Array.isArray(value) ? value.flatMap((entry) => name(entry) ?? []) : [];
}

function optionLabels(value: unknown): string[] {
  const selected = record(value);
  if (!selected) return [];
  return Object.values(selected).flatMap((choices) => {
    if (!Array.isArray(choices)) return [];
    const names = choices.flatMap((choice) => {
      const item = record(choice);
      if (!item || typeof item.choiceName !== "string" || !item.choiceName.trim()) return [];
      const delta = price(item.priceDeltaCents);
      return `${item.choiceName}${delta && typeof item.priceDeltaCents === "number" && item.priceDeltaCents > 0 ? ` · +${delta}` : ""}`;
    });
    return names.length ? [`Choix · ${names.join(", ")}`] : [];
  });
}

export type CustomerOrderItemLabelGroup = {
  label: string;
  details: string[];
  /** Immutable TTC line snapshot. Undefined deliberately means legacy/unknown. */
  totalTtcCents?: number;
  isRewardItem: boolean;
};

function itemLabels(item: Record<string, unknown>): CustomerOrderItemLabelGroup {
  const quantity = typeof item.quantity === "number" && Number.isInteger(item.quantity) && item.quantity > 0 ? `${item.quantity}× ` : "";
  const itemName = typeof item.nameSnapshot === "string" && item.nameSnapshot.trim() ? item.nameSnapshot : "Produit";
  const details: string[] = [];
  const customizations = record(item.customizations);
  const duo = record(customizations?.duo);
  for (const [position, side] of [["Moitié 1", "left"], ["Moitié 2", "right"]] as const) {
    const half = record(duo?.[side]);
    if (!half || typeof half.name !== "string" || !half.name.trim()) continue;
    const base = typeof half.base === "string" && half.base.trim() ? ` · base ${half.base === "creme" ? "crème" : half.base}` : "";
    const ingredients = ingredientNames(half.ingredients);
    details.push(`${position} · ${half.name}${base}${ingredients.length ? ` · ${ingredients.join(", ")}` : ""}`);
  }
  for (const extra of Array.isArray(customizations?.addedSupplements) ? customizations.addedSupplements : []) {
    const supplement = record(extra);
    if (!supplement || typeof supplement.ingredientName !== "string" || !supplement.ingredientName.trim()) continue;
    const savedPrice = price(supplement.priceDeltaCents);
    details.push(`+ ${supplement.ingredientName}${savedPrice ? ` · +${savedPrice}` : ""}`);
  }
  for (const removed of Array.isArray(customizations?.removedIngredients) ? customizations.removedIngredients : []) {
    const ingredient = record(removed);
    if (ingredient && typeof ingredient.ingredientName === "string" && ingredient.ingredientName.trim()) details.push(`Sans ${ingredient.ingredientName}`);
  }
  details.push(...optionLabels(customizations?.selectedTemplateOptions));
  details.push(...optionLabels(customizations?.selectedLegacyOptions));
  const totalTtcCents = typeof item.totalTtcCents === "number" && Number.isSafeInteger(item.totalTtcCents) && item.totalTtcCents >= 0
    ? item.totalTtcCents : undefined;
  return { label: `${quantity}${itemName}`, details, totalTtcCents, isRewardItem: item.isRewardItem === true };
}

/** Groups immutable labels by order line for checkout while retaining legacy text readers. */
export function customerOrderItemLabelGroups(data: Record<string, unknown>): CustomerOrderItemLabelGroup[] {
  if (!Array.isArray(data.items)) return [];
  return data.items.flatMap((raw) => {
    const item = record(raw);
    return item ? [itemLabels(item)] : [];
  });
}

function price(cents: unknown): string | null {
  return typeof cents === "number" && Number.isInteger(cents) && cents >= 0
    ? `${(cents / 100).toFixed(2).replace(".", ",")} €` : null;
}

/** Read immutable customer-facing detail only from the order snapshot. */
export function customerOrderItemLabels(data: Record<string, unknown>): string[] {
  return customerOrderItemLabelGroups(data).flatMap(({ label, details }) => [label, ...details]);
}
