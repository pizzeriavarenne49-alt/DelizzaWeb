import { repo, withFallback, mockRepo } from "@/data/repository";
import OffersClient from "./OffersClient";

export default async function OffersPage() {
  const offers = await withFallback(
    () => repo.getOffers(),
    () => mockRepo.getOffers(),
  );

  return <OffersClient offers={offers} />;
}
