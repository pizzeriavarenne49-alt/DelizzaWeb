import { repo, withFallback, mockRepo, POPULAR_CATEGORY } from "@/data/repository";
import MenuClient from "./MenuClient";
import type { Metadata } from "next";
import { SITE_URL, OG_IMAGE } from "@/lib/seo";

export const metadata: Metadata = {
  "title": {
    "absolute": "La carte des pizzas à emporter — Pizza Deli'Zza"
  },
  "description": "Consultez la carte Deli'Zza : choisissez vos pizzas et composez votre commande à retirer à La Varenne, à Orée d'Anjou.",
  "alternates": {
    "canonical": "/menu"
  },
  "openGraph": {
    "title": "La carte des pizzas à emporter — Pizza Deli'Zza",
    "description": "Consultez la carte Deli'Zza : choisissez vos pizzas et composez votre commande à retirer à La Varenne, à Orée d'Anjou.",
    "url": `${SITE_URL}/menu`,
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
    "title": "La carte des pizzas à emporter — Pizza Deli'Zza",
    "description": "Consultez la carte Deli'Zza : choisissez vos pizzas et composez votre commande à retirer à La Varenne, à Orée d'Anjou.",
    "images": [
      OG_IMAGE
    ]
  }
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
