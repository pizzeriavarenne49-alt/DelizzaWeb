import type { NextConfig } from "next";

const directusHostname = process.env.NEXT_PUBLIC_DIRECTUS_URL
  ? new URL(process.env.NEXT_PUBLIC_DIRECTUS_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: directusHostname
      ? [{ protocol: "https", hostname: directusHostname }, { protocol: "http", hostname: directusHostname }]
      : [],
  },
};

export default nextConfig;
