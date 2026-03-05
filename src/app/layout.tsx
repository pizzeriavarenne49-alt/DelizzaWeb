import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE_URL, BUSINESS, OG_IMAGE } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import GoogleAnalytics from "@/components/seo/GoogleAnalytics";
import { restaurantSchema, webSiteSchema } from "@/lib/schemas";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Pizza Deli'Zza — Pizzeria à emporter à La Varenne (Orée d'Anjou)",
    template: "%s | Pizza Deli'Zza",
  },
  description: BUSINESS.description,
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: BUSINESS.name,
    locale: "fr_FR",
    url: SITE_URL,
    title: "Pizza Deli'Zza — Pizzeria artisanale à La Varenne",
    description: BUSINESS.shortDescription,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Pizza artisanale Deli'Zza" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pizza Deli'Zza — Pizzeria artisanale à La Varenne",
    description: BUSINESS.shortDescription,
    images: [OG_IMAGE],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0D0D0D",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <JsonLd data={restaurantSchema()} />
        <JsonLd data={webSiteSchema()} />
      </head>
      <body className="antialiased">
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
