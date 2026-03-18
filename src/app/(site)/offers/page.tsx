import type { Metadata } from "next";
import { repo, withFallback, mockRepo } from "@/data/repository";
import { OG_IMAGE, SITE_URL } from "@/lib/seo";
import OffersClient from "./OffersClient";

export const metadata: Metadata = {
  title: "Offres et promotions — Pizza Deli'Zza",
  description:
    "Retrouvez les offres et promotions de Pizza Deli'Zza, votre pizzeria artisanale à La Varenne.",
  alternates: { canonical: "/offers" },
  openGraph: {
    title: "Offres et promotions — Pizza Deli'Zza",
    description:
      "Découvrez les offres et promotions de Pizza Deli'Zza. Pizzeria artisanale à La Varenne, Orée d'Anjou.",
    url: `${SITE_URL}/offers`,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Pizza Deli'Zza — Offres et promotions" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Offres et promotions — Pizza Deli'Zza",
    description:
      "Découvrez les offres et promotions de Pizza Deli'Zza. Pizzeria artisanale à La Varenne.",
    images: [OG_IMAGE],
  },
};

export default async function OffersPage() {
  const offers = await withFallback(
    () => repo.getOffers(),
    () => mockRepo.getOffers(),
  );

  return <OffersClient offers={offers} />;
}
