"use client";

import { useState, useEffect } from "react";
import SearchBar from "@/components/ui/SearchBar";
import Chip from "@/components/ui/Chip";
import ProductCard from "@/components/ui/ProductCard";
import SectionHeader from "@/components/ui/SectionHeader";
import type { Product, Category } from "@/types";
import { repo, withFallback, mockRepo } from "@/data/repository";
import { track } from "@/analytics";

export default function MenuPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("popular");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    track({ name: "view_menu" });
    async function load() {
      const [cats, prods] = await Promise.all([
        withFallback(() => repo.getCategories(), () => mockRepo.getCategories()),
        withFallback(() => repo.getProducts(), () => mockRepo.getProducts()),
      ]);
      setCategories([{ id: "popular", name: "Populaire", slug: "populaire", order: -1, active: true, icon: "🔥" }, ...cats]);
      setProducts(prods);
    }
    load();
  }, []);

  const byCategory =
    activeCategory === "popular"
      ? products
      : products.filter((p) => p.category === activeCategory);

  const results = search
    ? byCategory.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.description_short.toLowerCase().includes(search.toLowerCase()),
      )
    : byCategory;

  return (
    <div className="flex flex-col gap-5 px-4 pt-4">
      <h1 className="text-[22px] font-bold text-[#F5F5F5]">Menu</h1>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Rechercher un plat…"
      />

      {/* Category chips */}
      <div
        className="no-scrollbar flex gap-2 overflow-x-auto -mx-4 px-4"
        role="tablist"
        aria-label="Catégories"
      >
        {categories.map((cat) => (
          <Chip
            key={cat.id}
            label={cat.name}
            icon={cat.icon}
            active={activeCategory === cat.id}
            onClick={() => setActiveCategory(cat.id)}
          />
        ))}
      </div>

      <SectionHeader
        title={
          activeCategory === "popular"
            ? "Tous les plats"
            : categories.find((c) => c.id === activeCategory)?.name ?? ""
        }
      />

      <div className="grid grid-cols-2 gap-3">
        {results.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
        {results.length === 0 && (
          <p className="col-span-2 py-10 text-center text-[#6B6B6B]">
            Aucun résultat trouvé
          </p>
        )}
      </div>
    </div>
  );
}
