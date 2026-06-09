import { repo, withFallback, mockRepo } from "@/data/repository";
import HomeClient from "./HomeClient";
import type { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Pizza Deli'Zza — Pizzeria artisanale à emporter à La Varenne",
  description:
    "Pizzeria artisanale à La Varenne (Orée d'Anjou). Pâte à longue fermentation, ingrédients frais et locaux. Commandez en click & collect ou passez nous voir !",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const featuredProducts = await withFallback(
    () => repo.getFeaturedProducts(),
    () => mockRepo.getFeaturedProducts(),
  );

  return <HomeClient featuredProducts={featuredProducts} />;
}
