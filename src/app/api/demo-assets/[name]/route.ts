import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const files: Record<string, string> = {
  "margherita-demo.webp": "image/webp",
  "quatre-fromages-demo.webp": "image/webp",
  "reine-demo.jpg": "image/jpeg",
  "chorizo-demo.jpg": "image/jpeg",
};

export async function GET(request: Request, context: { params: Promise<{ name: string }> }) {
  const { name } = await context.params;
  const loopback = new URL(request.url).hostname;
  const enabled = process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_PIZZA_DUO_LOCAL_EMULATOR === "true" &&
    process.env.NEXT_PUBLIC_ENABLE_PIZZA_DUO === "true" &&
    process.env.FIREBASE_PROJECT_ID === "demo-web-duo" &&
    ["localhost", "127.0.0.1", "::1"].includes(loopback);
  if (!enabled || !Object.hasOwn(files, name)) return new NextResponse(null, { status: 404 });
  try {
    const file = await readFile(path.join(process.cwd(), "tests", "fixtures", "pizza-captures", name));
    return new NextResponse(file, { headers: { "Content-Type": files[name], "Cache-Control": "no-store" } });
  } catch { return new NextResponse(null, { status: 404 }); }
}
