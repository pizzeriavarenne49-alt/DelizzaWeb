import { repo, withFallback, mockRepo, POPULAR_CATEGORY } from "@/data/repository";
import MenuClient from "./MenuClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Menu pizzas artisanales — Pizza Deli'Zza à La Varenne",
  description:
    "Découvrez notre menu : pizzas artisanales, entrées et desserts préparés avec des ingrédients frais et locaux. Commandez en ligne pour un retrait à La Varenne.",
  alternates: { canonical: "/menu" },
};

export default async function MenuPage() {
  const [cats, prods] = await Promise.all([
    withFallback(() => repo.getCategories(), () => mockRepo.getCategories()),
    withFallback(() => repo.getProducts(), () => mockRepo.getProducts()),
  ]);

  return (
    <MenuClient
      categories={[POPULAR_CATEGORY, ...cats]}
      products={prods}
    />
  );
}
