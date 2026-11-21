import type { NextConfig } from "next";

const directusHostname = process.env.NEXT_PUBLIC_DIRECTUS_URL
  ? new URL(process.env.NEXT_PUBLIC_DIRECTUS_URL).hostname
  : undefined;

const pizzaDuoLocal =
  process.env.NEXT_PUBLIC_ENABLE_PIZZA_DUO === "true" &&
  process.env.NEXT_PUBLIC_PIZZA_DUO_LOCAL_EMULATOR === "true";
const isolatedLocalMode = process.env.NEXT_PUBLIC_HALLOWEEN_LOCAL === "true" || pizzaDuoLocal;
const isolatedLocalProject = pizzaDuoLocal ? "demo-web-duo" : "demo-halloween-local";
const localStripeTest = pizzaDuoLocal &&
  process.env.NEXT_PUBLIC_DELIZZA_LOCAL_STRIPE_TEST === "true" &&
  /^pk_test_[A-Za-z0-9]+$/.test(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");
const stripeScriptOrigins = localStripeTest ? " https://js.stripe.com https://*.js.stripe.com" : "";
const stripeFrameOrigins = localStripeTest ? `${stripeScriptOrigins} https://hooks.stripe.com` : "";
const stripeConnectOrigins = localStripeTest ? " https://api.stripe.com" : "";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  // Local-only isolation: never reuse a development bundle built with real Firebase settings.
  ...(isolatedLocalMode ? {
    distDir: pizzaDuoLocal ? ".next-pizza-duo-local" : ".next-halloween-local",
    // Capture-only local instance: keep the framework badge out of screenshots.
    devIndicators: false,
    async headers() {
      if (process.env.NODE_ENV !== "development" || process.env.FIREBASE_PROJECT_ID !== isolatedLocalProject) {
        throw new Error("Isolated local mode must never run as a production build or project.");
      }
      return [{ source: "/:path*", headers: [{
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          `connect-src 'self' http://127.0.0.1:* ws://127.0.0.1:* http://localhost:* ws://localhost:*${stripeConnectOrigins}`,
          `script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:${stripeScriptOrigins}`,
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "font-src 'self' data:",
          "media-src 'self' blob:",
          `frame-src 'self'${stripeFrameOrigins}`,
          "form-action 'self'",
          "object-src 'none'",
        ].join("; "),
      }] }];
    },
  } : {}),
  images: {
    qualities: [60, 75],
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
