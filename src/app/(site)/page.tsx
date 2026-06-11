import { repo, withFallback, mockRepo } from "@/data/repository";
import { DIRECTUS_URL } from "@/config/cms";
import HomeClient from "./HomeClient";
import type { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Pizza Deli'Zza — Pizzeria artisanale à emporter à La Varenne",
  description:
    "Pizzeria artisanale à La Varenne (Orée d'Anjou). Pâte à longue fermentation, ingrédients frais et locaux. Commandez en click & collect ou passez nous voir !",
  alternates: { canonical: "/" },
};

function hasRealCmsSourceConfigured(): boolean {
  const hasFirebaseConfig =
    Boolean(process.env.FIREBASE_PROJECT_ID) &&
    Boolean(process.env.FIREBASE_CLIENT_EMAIL) &&
    Boolean(process.env.FIREBASE_PRIVATE_KEY) &&
    Boolean(process.env.WL_APP_ID);

  return hasFirebaseConfig || Boolean(DIRECTUS_URL);
}

async function loadFeaturedProducts() {
  if (process.env.NODE_ENV === "production") {
    if (!hasRealCmsSourceConfigured()) {
      console.warn("[CMS] No real CMS source configured for home carousel; rendering empty state in production.");
      return [];
    }

    try {
      return await repo.getFeaturedProducts();
    } catch (err) {
      console.warn("[CMS] Home carousel source unavailable in production; rendering empty state.", err);
      return [];
    }
  }

  return withFallback(
    () => repo.getFeaturedProducts(),
    () => mockRepo.getFeaturedProducts(),
  );
}

export default async function HomePage() {
  const featuredProducts = await loadFeaturedProducts();

  return <HomeClient featuredProducts={featuredProducts} />;
}
