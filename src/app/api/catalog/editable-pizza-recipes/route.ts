import { NextResponse } from "next/server";
import { usesIsolatedPizzaDuoFirestoreEmulator } from "@/config/firebase";
import { repo } from "@/data/repository";
import { isPizzaDuoRecipeCandidate } from "@/lib/pizza-duo";

export const dynamic = "force-dynamic";

/** Read-only, enriched recipe list for the local Duo editor. */
export async function GET() {
  if (!usesIsolatedPizzaDuoFirestoreEmulator()) return new NextResponse(null, { status: 404 });
  const recipes = (await repo.getProducts()).filter(isPizzaDuoRecipeCandidate);
  return NextResponse.json(recipes, { headers: { "Cache-Control": "no-store" } });
}
