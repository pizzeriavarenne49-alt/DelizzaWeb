import { repo, withFallback, mockRepo, POPULAR_CATEGORY } from "@/data/repository";
import MenuClient from "./MenuClient";

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
