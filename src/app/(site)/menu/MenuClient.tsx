"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import SearchBar from "@/components/ui/SearchBar";
import Chip from "@/components/ui/Chip";
import ProductCard from "@/components/ui/ProductCard";
import SectionHeader from "@/components/ui/SectionHeader";
import { useOnlineOrderingStatus } from "@/contexts/OnlineOrderingStatusContext";
import type { Product, Category } from "@/types";
import { track } from "@/analytics";
import { isPizzaDuoDevelopmentEnabled, isPizzaDuoProduct, isPizzaDuoRecipe, PIZZA_DUO_CATEGORY_ID } from "@/lib/pizza-duo";
import { useCatalogAvailability } from "@/contexts/CatalogAvailabilityContext";
import type { StockAvailabilityProduct } from "@/lib/product-availability";

interface MenuClientProps {
  categories: Category[];
  products: Product[];
  pizzaDuoWebEnabled: boolean;
  requestedProductId?: string;
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

function withLiveAvailability(product: Product, availability: Record<string, StockAvailabilityProduct> | null): Product {
  if (availability === null) return product;
  const live = availability[product.id];
  if (!live) return { ...product, manualOutOfStock: true };
  return {
    ...product,
    manualOutOfStock: live.manualOutOfStock,
    stockManaged: live.stockManaged,
    stockQty: live.stockQty ?? undefined,
  };
}

const subscribeToFixedEnvironment = () => () => {};
const hideDuoDuringServerRender = () => false;

export default function MenuClient({ categories, products, pizzaDuoWebEnabled, requestedProductId }: MenuClientProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const onlineOrdering = useOnlineOrderingStatus();
  const catalogAvailability = useCatalogAvailability();
  const localPizzaDuoEnabled = useSyncExternalStore(subscribeToFixedEnvironment, isPizzaDuoDevelopmentEnabled, hideDuoDuringServerRender);
  const pizzaDuoEnabled = pizzaDuoWebEnabled || localPizzaDuoEnabled;
  // This uses the provider's single SSE snapshot: a recipe removed or restored
  // while the Duo modal is open is reflected without another subscription.
  const liveProducts = useMemo(() => products.map((product) => withLiveAvailability(product, catalogAvailability)), [products, catalogAvailability]);
  const pizzaDuoRecipes = liveProducts.filter(isPizzaDuoRecipe);
  const visibleCatalogProducts = liveProducts.filter((product) => !isPizzaDuoProduct(product) || pizzaDuoEnabled);
  const duoProducts = visibleCatalogProducts.filter(isPizzaDuoProduct);
  const standardProducts = visibleCatalogProducts.filter((product) => !isPizzaDuoProduct(product));
  const hasDuo = duoProducts.length > 0;
  const assignedDuoCategory = categories.find((category) => category.id === PIZZA_DUO_CATEGORY_ID &&
    duoProducts.some((product) => product.category === category.id));
  const duoCategoryTitle = assignedDuoCategory?.name ?? "Pizza Duo";
  const activeCategory = selectedCategory === PIZZA_DUO_CATEGORY_ID && !hasDuo ? "all" : selectedCategory;
  const isDuoCategory = activeCategory === PIZZA_DUO_CATEGORY_ID;
  const menuCategories = categories.filter((category) => category.id !== "popular" &&
    (category.id !== PIZZA_DUO_CATEGORY_ID || category === assignedDuoCategory));
  const renderProduct = (product: Product) => (
    <ProductCard
      key={product.id}
      product={product}
      pizzaDuoRecipes={pizzaDuoRecipes}
      pizzaDuoWebEnabled={pizzaDuoEnabled}
      initiallyOpen={product.id === requestedProductId}
    />
  );

  useEffect(() => {
    track({ name: "view_menu" });
  }, []);

  const searchTerm = normalizeText(search.trim());
  const isSearching = searchTerm.length > 0;

  const searchFilteredProducts = (isDuoCategory ? duoProducts : visibleCatalogProducts).filter((product) => {
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

  const visibleCategories = menuCategories
    .slice()
    .sort((a, b) => {
      if (assignedDuoCategory) return a.order - b.order;
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
  const duoSection = { id: PIZZA_DUO_CATEGORY_ID, title: duoCategoryTitle, products: duoProducts };
  if (hasDuo && !assignedDuoCategory) {
    allSections.push(duoSection);
  }

  for (const category of visibleCategories) {
    if (category.id === PIZZA_DUO_CATEGORY_ID) {
      allSections.push(duoSection);
      continue;
    }
    if (category.id === "pizzas") {
      const recipePizzas = standardProducts.filter((product) => product.category === "pizzas");
      const baseTomate = recipePizzas.filter((product) => !isCreamBasePizza(product));
      const baseCreme = recipePizzas.filter((product) => isCreamBasePizza(product));

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

    const categoryProducts = standardProducts.filter((product) => product.category === category.id);
    if (categoryProducts.length === 0) {
      continue;
    }

    allSections.push({
      id: category.id,
      title: category.name,
      products: categoryProducts,
    });
  }

  const activeCategoryName = isDuoCategory
    ? duoCategoryTitle
    : menuCategories.find((category) => category.id === activeCategory)?.name ?? "";
  const visibleProducts = isDuoCategory
    ? duoProducts
    : standardProducts.filter((product) => product.category === activeCategory);

  return (
    <div className="flex flex-col gap-5 px-4 pt-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4A053]">La carte Deli&apos;Zza</p>
        <h1 className="mt-2 text-[28px] font-bold text-[#F5F5F5]">Nos pizzas à emporter</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#B8B1A7]">Choisissez votre recette et personnalisez-la. Retrait au 98 Place du Jardin Public, à La Varenne. Sans livraison.</p>
      </header>

      {!onlineOrdering.canStartOrder && (
        <div className="rounded-[14px] border border-[#D4A053]/30 bg-[#D4A053]/10 px-4 py-3 text-[13px] leading-relaxed text-[#F5F5F5]">
          {onlineOrdering.message}
        </div>
      )}

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Rechercher un plat…"
      />

      <div
        className="no-scrollbar flex gap-2 overflow-x-auto -mx-4 px-4"
        role="group"
        aria-label="Catégories"
      >
        <Chip
          label="Tous"
          icon="✨"
          active={activeCategory === "all"}
          onClick={() => setSelectedCategory("all")}
        />
        {hasDuo && !assignedDuoCategory && (
          <Chip
            label={duoCategoryTitle}
            active={isDuoCategory}
            onClick={() => {
              setSearch("");
              setSelectedCategory(PIZZA_DUO_CATEGORY_ID);
            }}
          />
        )}
        {menuCategories.map((cat) => (
          <Chip
            key={cat.id}
            label={cat.name}
            icon={cat.icon}
            active={activeCategory === cat.id}
            onClick={() => {
              if (cat.id === PIZZA_DUO_CATEGORY_ID) setSearch("");
              setSelectedCategory(cat.id);
            }}
          />
        ))}
      </div>

      {isSearching ? (
        <div className="flex flex-col gap-4">
          <SectionHeader title={`Résultats pour "${search.trim()}"`} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {searchFilteredProducts.map(renderProduct)}
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
                {section.products.map(renderProduct)}
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
            {visibleProducts.map(renderProduct)}
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
