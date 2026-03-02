import { repo, withFallback, mockRepo, POPULAR_CATEGORY } from "@/data/repository";
import HomeClient from "./HomeClient";

export default async function HomePage() {
  const [slides, cats, prods] = await Promise.all([
    withFallback(() => repo.getHomeHeroSlides(), () => mockRepo.getHomeHeroSlides()),
    withFallback(() => repo.getCategories(), () => mockRepo.getCategories()),
    withFallback(() => repo.getProducts(), () => mockRepo.getProducts()),
  ]);

  return (
    <HomeClient
      heroSlides={slides}
      categories={[POPULAR_CATEGORY, ...cats]}
      products={prods}
    />
  );
}
