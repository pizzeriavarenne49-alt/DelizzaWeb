/** Shared by the server-rendered menu and its public availability stream. */
export function isPublicProductDoc(data: Record<string, unknown>): boolean {
  if (data.isActive === false) return false;
  if (["visible", "published", "public", "isVisible"].some((field) => data[field] === false)) return false;
  if (["archived", "isArchived", "deleted", "isDeleted"].some((field) => data[field] === true)) return false;
  if (typeof data.categoryId !== "string" || !data.categoryId) return false;
  const price = data.price as Record<string, unknown> | undefined;
  const priceCents = typeof price?.amountCents === "number" ? price.amountCents : data.priceCents;
  return typeof priceCents === "number" && priceCents > 0;
}
