import { NextResponse } from "next/server";
import { repo } from "@/data/repository";
import { isPizzaDuoRecipe } from "@/lib/pizza-duo";

export const dynamic = "force-dynamic";

/** Read-only edit source. It deliberately shares the enriched public catalogue
 * used by the menu, rather than a second client-side Firestore mapper. */
export async function GET(request: Request, context: { params: Promise<{ catalogItemId: string }> }) {
  if ((process.env.WL_APP_ID ?? "d_lizza") !== "d_lizza") return new NextResponse(null, { status: 404 });
  const { catalogItemId } = await context.params;
  if (!catalogItemId || catalogItemId.trim() !== catalogItemId || catalogItemId.includes("/") ||
      catalogItemId === "." || catalogItemId === ".." || /^__.*__$/.test(catalogItemId) ||
      Buffer.byteLength(catalogItemId, "utf8") > 1500) return new NextResponse(null, { status: 404 });
  const products = await repo.getProducts();
  const product = products.find((candidate) => candidate.id === catalogItemId);
  if (!product || product.manualOutOfStock) {
    return new NextResponse(null, { status: 404 });
  }
  // Preserve the normal Product response for existing cart/checkout readers.
  // A Duo editor explicitly opts in to a single, internally consistent parent
  // and selectable-recipe snapshot when it is reopened from a stale menu tab.
  if (product.kind === "pizza_duo" && new URL(request.url).searchParams.get("includeDuoRecipes") === "1") {
    return NextResponse.json(
      { product, recipes: products.filter(isPizzaDuoRecipe) },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(product, { headers: { "Cache-Control": "no-store" } });
}
