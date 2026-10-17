import { getDb, WL_APP_ID } from "@/config/firebase";
import { isPublicProductDoc } from "@/lib/catalog-publication";
import { isFirebaseSourceActive } from "@/data/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Guests cannot read Firestore directly. Expose only the availability of the
// same public products as the menu, for the server-configured tenant.
export async function GET(request: Request): Promise<Response> {
  if (!isFirebaseSourceActive() || !WL_APP_ID) return new Response(null, { status: 204 });
  const encoder = new TextEncoder();
  let cleanup: (close?: boolean) => void = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let stopped = false;
      let lastPayload = "";
      let unsubscribe = () => {};
      const stop = (close = true) => {
        if (stopped) return;
        stopped = true;
        clearInterval(heartbeat);
        clearTimeout(lifetime);
        unsubscribe();
        request.signal.removeEventListener("abort", abort);
        if (close) controller.close();
      };
      const heartbeat = setInterval(() => controller.enqueue(encoder.encode(": keepalive\n\n")), 15000);
      // Reconnect within common hosting request limits; EventSource retries.
      const lifetime = setTimeout(stop, 55000);
      cleanup = stop;
      const abort = () => stop();
      request.signal.addEventListener("abort", abort, { once: true });
      if (request.signal.aborted) { stop(); return; }
      try {
        unsubscribe = getDb().collection("wl_catalog_items").where("appId", "==", WL_APP_ID)
          .onSnapshot((snapshot) => {
            if (stopped) return;
            const products = Object.fromEntries(snapshot.docs
              .filter((doc) => isPublicProductDoc(doc.data()))
              .map((doc) => {
                const data = doc.data();
                return [doc.id, {
                  stockManaged: data.stockManaged === true,
                  stockQty: Number.isSafeInteger(data.stockQty) && data.stockQty >= 0 ? data.stockQty : null,
                  manualOutOfStock: data.manualOutOfStock === true,
                }];
              }));
            const payload = JSON.stringify(products);
            if (payload === lastPayload) return;
            lastPayload = payload;
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }, () => stop());
      } catch {
        stop();
      }
    },
    cancel() { cleanup(false); },
  });
  return new Response(stream, { headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-store, no-transform",
    "X-Accel-Buffering": "no",
  } });
}
