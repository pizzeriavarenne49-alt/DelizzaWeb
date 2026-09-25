import type { Metadata } from "next";
import { OG_IMAGE, SITE_URL } from "@/lib/seo";
import DownloadClient from "./DownloadClient";

export const metadata: Metadata = {
  title: "Application — Commander sur le site",
  description:
    "Retrouvez les informations sur l'application Deli'Zza. Pour commander vos pizzas en click & collect à La Varenne, utilisez le menu du site.",
  alternates: { canonical: "/download" },
  openGraph: {
    title: "Application Deli'Zza — Commander sur le site",
    description:
      "Consultez les informations sur l'application Deli'Zza et accédez au menu du site pour un retrait à La Varenne.",
    url: `${SITE_URL}/download`,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Application Pizza Deli'Zza" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Application Deli'Zza — Commander sur le site",
    description:
      "Consultez les informations sur l'application Deli'Zza et accédez au menu du site pour un retrait à La Varenne.",
    images: [OG_IMAGE],
  },
};

export default function DownloadPage() {
  return <DownloadClient />;
}
