import { repo, withFallback, mockRepo } from "@/data/repository";
import OffersClient from "./OffersClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nos Offres — Pizza Deli'Zza",
  description:
    "Profitez de nos promotions et offres spéciales sur vos pizzas préférées. Découvrez les deals du moment chez Deli'Zza.",
};

export default async function OffersPage() {
  const offers = await withFallback(
    () => repo.getOffers(),
    () => mockRepo.getOffers(),
  );

  return <OffersClient offers={offers} />;
}
