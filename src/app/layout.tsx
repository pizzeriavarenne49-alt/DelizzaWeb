import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { SITE_URL, BUSINESS, OG_IMAGE } from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import GoogleAnalytics from "@/components/seo/GoogleAnalytics";
import { restaurantSchema, webSiteSchema } from "@/lib/schemas";
import { COMING_SOON } from "@/lib/comingSoon";
import ComingSoonOverlay from "@/components/ComingSoonOverlay";

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-poppins",
});

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
    <html lang="fr" className={poppins.variable}>
      <head>
        <JsonLd data={restaurantSchema()} />
        <JsonLd data={webSiteSchema()} />
      </head>
      <body className="antialiased">
        <GoogleAnalytics />
        {COMING_SOON && <ComingSoonOverlay />}
        {children}
      </body>
    </html>
  );
}
