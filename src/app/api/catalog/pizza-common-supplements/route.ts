import { getDb, WL_APP_ID } from "@/config/firebase";

export const dynamic = "force-dynamic";

/**
 * Read-only policy used by the browser's final cart preflight. It deliberately
 * exposes neither ingredient details nor any other tenant configuration.
 * Missing preserves legacy per-product supplement lists; [] means disabled.
 */
export async function GET(): Promise<Response> {
  if (WL_APP_ID !== "d_lizza") return new Response(null, { status: 404 });
  const app = await getDb().collection("wl_apps").doc(WL_APP_ID).get();
  const value = app.data()?.pizzaCommonSupplementIds;
  if (!Array.isArray(value)) {
    return Response.json({ configured: false }, { headers: { "Cache-Control": "no-store" } });
  }
  return Response.json(
    { configured: true, ids: value.filter((id): id is string => typeof id === "string") },
    { headers: { "Cache-Control": "no-store" } },
  );
}
