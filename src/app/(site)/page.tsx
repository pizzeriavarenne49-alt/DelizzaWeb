import { repo, withFallback, mockRepo, POPULAR_CATEGORY } from "@/data/repository";
import HomeClient from "./HomeClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pizza Deli'Zza — Pizzeria artisanale à emporter à La Varenne",
  description:
    "Pizzeria artisanale à La Varenne (Orée d'Anjou). Pâte à longue fermentation, ingrédients frais et locaux. Commandez en click & collect ou passez nous voir !",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [featuredProducts, cats, prods] = await Promise.all([
    withFallback(() => repo.getFeaturedProducts(), () => mockRepo.getFeaturedProducts()),
    withFallback(() => repo.getCategories(), () => mockRepo.getCategories()),
    withFallback(() => repo.getProducts(), () => mockRepo.getProducts()),
  ]);

  return (
    <HomeClient
      featuredProducts={featuredProducts}
      categories={[POPULAR_CATEGORY, ...cats]}
      products={prods}
    />
  );
}