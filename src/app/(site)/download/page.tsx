import type { Metadata } from "next";
import { OG_IMAGE, SITE_URL } from "@/lib/seo";
import DownloadClient from "./DownloadClient";

export const metadata: Metadata = {
  title: "Télécharger l'application — Pizza Deli'Zza",
  description:
    "Téléchargez l'application Pizza Deli'Zza pour commander vos pizzas artisanales en click & collect depuis La Varenne et ses alentours.",
  alternates: { canonical: "/download" },
  openGraph: {
    title: "Télécharger l'application — Pizza Deli'Zza",
    description:
      "Commandez vos pizzas artisanales depuis l'application Pizza Deli'Zza. Click & collect, paiement sécurisé, retrait à La Varenne.",
    url: `${SITE_URL}/download`,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Application Pizza Deli'Zza" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Télécharger l'application — Pizza Deli'Zza",
    description:
      "Commandez vos pizzas artisanales depuis l'application Pizza Deli'Zza. Click & collect, retrait à La Varenne.",
    images: [OG_IMAGE],
  },
};

export default function DownloadPage() {
  return <DownloadClient />;
}
