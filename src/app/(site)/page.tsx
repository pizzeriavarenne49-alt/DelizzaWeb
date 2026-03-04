import { repo, withFallback, mockRepo, POPULAR_CATEGORY } from "@/data/repository";
import HomeClient from "./HomeClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pizza Deli'Zza — Pizzeria artisanale",
  description:
    "Découvrez les pizzas artisanales premium de Deli'Zza, préparées avec des ingrédients frais. Commandez depuis notre application mobile.",
};

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
