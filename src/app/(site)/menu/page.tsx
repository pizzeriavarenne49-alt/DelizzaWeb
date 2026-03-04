import { repo, withFallback, mockRepo, POPULAR_CATEGORY } from "@/data/repository";
import MenuClient from "./MenuClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notre Menu — Pizza Deli'Zza",
  description:
    "Parcourez notre menu de pizzas artisanales, entrées et desserts. Des ingrédients frais pour des saveurs authentiques.",
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
