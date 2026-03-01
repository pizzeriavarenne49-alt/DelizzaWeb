/**
 * CMS configuration — single source of truth for Directus connection.
 *
 * The site reads data from Directus REST API.
 * Set NEXT_PUBLIC_DIRECTUS_URL in your environment (.env.local).
 * If the variable is missing the app falls back to mock data.
 */

export const DIRECTUS_URL: string | undefined =
  process.env.NEXT_PUBLIC_DIRECTUS_URL;

/** Default timeout for Directus fetch calls (ms) */
export const FETCH_TIMEOUT_MS = 5_000;

/** ISR revalidation intervals (seconds) */
export const REVALIDATE = {
  home: 120,
  menu: 120,
  offers: 60,
} as const;

/** Next.js fetch options with ISR cache */
export function fetchOptions(
  revalidate: number,
): Pick<RequestInit, "next"> & { signal?: AbortSignal } {
  return { next: { revalidate } };
}

/**
 * Build a Directus asset URL for a file id.
 * Supports optional width/height/fit parameters for on-the-fly transforms.
 */
export function assetUrl(
  fileId: string | null | undefined,
  opts?: { width?: number; height?: number; fit?: "cover" | "contain" | "inside" },
): string {
  if (!fileId || !DIRECTUS_URL) return "/images/placeholder.svg";
  const params = new URLSearchParams();
  if (opts?.width) params.set("width", String(opts.width));
  if (opts?.height) params.set("height", String(opts.height));
  if (opts?.fit) params.set("fit", String(opts.fit));
  const qs = params.toString();
  return `${DIRECTUS_URL}/assets/${fileId}${qs ? `?${qs}` : ""}`;
}
