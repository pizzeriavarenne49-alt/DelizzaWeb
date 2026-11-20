import { NextResponse } from "next/server";
import { repo } from "@/data/repository";
import { isPizzaDuoRecipeCandidate } from "@/lib/pizza-duo";

export const dynamic = "force-dynamic";

/** Read-only, enriched recipe list for the local Duo editor. */
export async function GET() {
  const recipes = (await repo.getProducts()).filter(isPizzaDuoRecipeCandidate);
  return NextResponse.json(recipes, { headers: { "Cache-Control": "no-store" } });
}
