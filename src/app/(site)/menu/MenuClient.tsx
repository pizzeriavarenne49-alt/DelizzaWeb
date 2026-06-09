"use client";

import { useEffect, useState } from "react";
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

type MenuSection = {
  id: string;
  title: string;
  products: Product[];
};

const CATEGORY_PRIORITY = [
  "pizzas",
  "entrees",
  "desserts",
  "boissons",
  "promos",
];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function MenuClient({ categories, products }: MenuClientProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    track({ name: "view_menu" });
  }, []);

  const searchTerm = normalizeText(search.trim());
  const isSearching = searchTerm.length > 0;

  const searchFilteredProducts = products.filter((product) => {
    if (!isSearching) {
      return true;
    }

    const haystack = normalizeText(
      [
        product.name,
        product.description_short,
        ...product.ingredients,
        ...product.tags,
      ].join(" "),
    );

    return haystack.includes(searchTerm);
  });

  const isCreamBasePizza = (product: Product) => {
    const haystack = normalizeText(
      [
        product.name,
        product.description_short,
        ...product.ingredients,
        ...product.tags,
      ].join(" "),
    );

    return haystack.includes("creme");
  };

  const visibleCategories = categories
    .filter((category) => category.id !== "popular")
    .slice()
    .sort((a, b) => {
      const priorityOf = (id: string) => {
        const priority = CATEGORY_PRIORITY.indexOf(id);
        return priority === -1 ? Number.MAX_SAFE_INTEGER : priority;
      };

      const priorityDiff = priorityOf(a.id) - priorityOf(b.id);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return a.order - b.order;
    });

  const allSections: MenuSection[] = [];

  for (const category of visibleCategories) {
    if (category.id === "pizzas") {
      const pizzaProducts = products.filter((product) => product.category === "pizzas");
      const baseTomate = pizzaProducts.filter((product) => !isCreamBasePizza(product));
      const baseCreme = pizzaProducts.filter((product) => isCreamBasePizza(product));

      if (baseTomate.length > 0) {
        allSections.push({
          id: "pizzas-base-tomate",
          title: "Base tomate",
          products: baseTomate,
        });
      }

      if (baseCreme.length > 0) {
        allSections.push({
          id: "pizzas-base-creme",
          title: "Base crème",
          products: baseCreme,
        });
      }

      continue;
    }

    const categoryProducts = products.filter((product) => product.category === category.id);
    if (categoryProducts.length === 0) {
      continue;
    }

    allSections.push({
      id: category.id,
      title: category.name,
      products: categoryProducts,
    });
  }

  const activeCategoryName =
    activeCategory === "popular"
      ? "Produits populaires"
      : activeCategory === "all"
        ? "Tout le catalogue"
        : categories.find((category) => category.id === activeCategory)?.name ?? "";

  const visibleProducts =
    activeCategory === "popular"
      ? searchFilteredProducts.filter((product) => product.is_popular)
      : activeCategory === "all"
        ? searchFilteredProducts
        : searchFilteredProducts.filter((product) => product.category === activeCategory);

  return (
    <div className="flex flex-col gap-5 px-4 pt-4">
      <h1 className="text-[22px] font-bold text-[#F5F5F5]">Menu</h1>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Rechercher un plat…"
      />

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

      {isSearching ? (
        <div className="flex flex-col gap-4">
          <SectionHeader title={`Résultats pour "${search.trim()}"`} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {searchFilteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
            {searchFilteredProducts.length === 0 && (
              <p className="col-span-2 py-10 text-center text-[#6B6B6B]">
                Aucun résultat trouvé
              </p>
            )}
          </div>
        </div>
      ) : activeCategory === "all" ? (
        <div className="flex flex-col gap-6">
          {allSections.map((section) => (
            <div key={section.id} className="flex flex-col gap-3">
              <SectionHeader title={section.title} />
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {section.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          ))}
          {allSections.length === 0 && (
            <p className="py-10 text-center text-[#6B6B6B]">
              Aucun résultat trouvé
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <SectionHeader title={activeCategoryName} />
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
      )}
    </div>
  );
}
