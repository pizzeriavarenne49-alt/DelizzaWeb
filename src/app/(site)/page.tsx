import { repo, withFallback, mockRepo } from "@/data/repository";
import { DIRECTUS_URL } from "@/config/cms";
import HomeClient from "./HomeClient";
import type { Metadata } from "next";
import { SITE_URL, OG_IMAGE } from "@/lib/seo";

export const revalidate = 60;

export const metadata: Metadata = {
  "title": {
    "absolute": "Pizza Deli'Zza — Pizzeria à La Varenne, Orée d'Anjou"
  },
  "description": "Pizza Deli'Zza à La Varenne, Orée d'Anjou : découvrez les pizzas de notre carte et composez votre commande à emporter en click & collect.",
  "alternates": {
    "canonical": "/"
  },
  "openGraph": {
    "title": "Pizza Deli'Zza — Pizzeria à La Varenne, Orée d'Anjou",
    "description": "Pizza Deli'Zza à La Varenne, Orée d'Anjou : découvrez les pizzas de notre carte et composez votre commande à emporter en click & collect.",
    "url": SITE_URL,
    "images": [
      {
        "url": OG_IMAGE,
        "width": 1200,
        "height": 630,
        "alt": "Pizza Deli'Zza — Pizzas à emporter à La Varenne"
      }
    ]
  },
  "twitter": {
    "card": "summary_large_image",
    "title": "Pizza Deli'Zza — Pizzeria à La Varenne, Orée d'Anjou",
    "description": "Pizza Deli'Zza à La Varenne, Orée d'Anjou : découvrez les pizzas de notre carte et composez votre commande à emporter en click & collect.",
    "images": [
      OG_IMAGE
    ]
  }
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
