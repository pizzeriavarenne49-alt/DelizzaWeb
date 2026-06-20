import { repo, withFallback, mockRepo, POPULAR_CATEGORY } from "@/data/repository";
import MenuClient from "./MenuClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Menu pizzas artisanales — Pizza Deli'Zza à La Varenne",
  description:
    "Découvrez la carte de Pizza Deli'Zza à Orée d'Anjou : pizzas artisanales à emporter, desserts, horaires et informations pratiques.",
  alternates: { canonical: "/menu" },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
