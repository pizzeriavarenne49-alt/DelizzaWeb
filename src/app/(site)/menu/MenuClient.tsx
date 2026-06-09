"use client";

import { useState, useEffect } from "react";
import SearchBar from "@/components/ui/SearchBar";
import Chip from "@/components/ui/Chip";
import ProductCard from "@/components/ui/ProductCard";
import SectionHeader from "@/components/ui/SectionHeader";
import type { Product, Category } from "@/types";
import { track } from "@/analytics";

interface MenuClientProps {
  categories: Category[];
  products: Product[];
}

export default function MenuClient({ categories, products }: MenuClientProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    track({ name: "view_menu" });
  }, []);

  const visibleProducts =
    search
      ? products.filter(
          (p) =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.description_short.toLowerCase().includes(search.toLowerCase()),
        )
      : activeCategory === "all"
        ? products
        : activeCategory === "popular"
          ? products.filter((p) => p.is_popular)
          : products.filter((p) => p.category === activeCategory);

  const headerTitle =
    activeCategory === "all"
      ? "Tout le catalogue"
      : activeCategory === "popular"
        ? "Produits populaires"
        : categories.find((c) => c.id === activeCategory)?.name ?? "";

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
        <Chip
          label="Tous"
          icon="✨"
          active={activeCategory === "all"}
          onClick={() => setActiveCategory("all")}
        />
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

      <SectionHeader title={headerTitle} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {visibleProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
        {visibleProducts.length === 0 && (
          <p className="col-span-2 py-10 text-center text-[#6B6B6B]">
            Aucun résultat trouvé
          </p>
        )}
      </div>
    </div>
  );
}
