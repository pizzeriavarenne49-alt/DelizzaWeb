import { NextResponse } from "next/server";
import { repo } from "@/data/repository";

export const dynamic = "force-dynamic";

/** Read-only edit source. It deliberately shares the enriched public catalogue
 * used by the menu, rather than a second client-side Firestore mapper. */
export async function GET(_request: Request, context: { params: Promise<{ catalogItemId: string }> }) {
  if ((process.env.WL_APP_ID ?? "d_lizza") !== "d_lizza") return new NextResponse(null, { status: 404 });
  const { catalogItemId } = await context.params;
  if (!catalogItemId || catalogItemId.trim() !== catalogItemId || catalogItemId.includes("/") ||
      catalogItemId === "." || catalogItemId === ".." || /^__.*__$/.test(catalogItemId) ||
      Buffer.byteLength(catalogItemId, "utf8") > 1500) return new NextResponse(null, { status: 404 });
  const product = (await repo.getProducts()).find((candidate) => candidate.id === catalogItemId);
  if (!product || product.manualOutOfStock) {
    return new NextResponse(null, { status: 404 });
  }
  return NextResponse.json(product, { headers: { "Cache-Control": "no-store" } });
}
