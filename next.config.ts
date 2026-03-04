import type { NextConfig } from "next";

const directusHostname = process.env.NEXT_PUBLIC_DIRECTUS_URL
  ? new URL(process.env.NEXT_PUBLIC_DIRECTUS_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      // Firebase Storage (WLHORIZON catalog images)
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      // Directus (if configured)
      ...(directusHostname
        ? [
            { protocol: "https" as const, hostname: directusHostname },
            { protocol: "http" as const, hostname: directusHostname },
          ]
        : []),
    ],
  },
};

export default nextConfig;
