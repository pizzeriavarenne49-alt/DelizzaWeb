"use client";

import { useState, useEffect } from "react";
import SearchBar from "@/components/ui/SearchBar";
import Chip from "@/components/ui/Chip";
import ProductCard from "@/components/ui/ProductCard";
import SectionHeader from "@/components/ui/SectionHeader";
import { categories, products } from "@/data/mock";
import { track } from "@/analytics";

const activeProducts = products.filter((p) => p.active);

export default function MenuPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("popular");

  useEffect(() => {
    track({ name: "view_menu" });
  }, []);

  const byCategory =
    activeCategory === "popular"
      ? activeProducts
      : activeProducts.filter((p) => p.categoryId === activeCategory);

  const results = search
    ? byCategory.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.description.toLowerCase().includes(search.toLowerCase()),
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
            label={cat.label}
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
            : categories.find((c) => c.id === activeCategory)?.label ?? ""
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
