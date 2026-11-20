import { NextRequest, NextResponse } from "next/server";
import { getStorageBucket } from "@/config/firebase";
import { isCurrentPublishedPromotionImage } from "@/data/website-homepage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  if (!path || !(await isCurrentPublishedPromotionImage(path))) return new NextResponse(null, { status: 404 });
  const file = getStorageBucket().file(path);
  const [exists] = await file.exists();
  if (!exists) return new NextResponse(null, { status: 404 });
  const [contents] = await file.download();
  return new NextResponse(new Uint8Array(contents), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=60, stale-while-revalidate=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
