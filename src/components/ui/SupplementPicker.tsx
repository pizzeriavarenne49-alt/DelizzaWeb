"use client";

import { useState, type ReactNode } from "react";
import SearchBar from "@/components/ui/SearchBar";
import { INGREDIENT_CATEGORY_LABELS, type IngredientCategory, type ProductIngredient } from "@/types";

const PAGE_SIZE = 4;
const ingredientCategories = Object.keys(INGREDIENT_CATEGORY_LABELS) as IngredientCategory[];
const pageButtonClass = "min-h-11 rounded-xl border border-[#584634] px-3 text-xs font-semibold text-[#F0D5A8] hover:border-[#D4A053] focus-visible:outline-2 focus-visible:outline-[#E8C078] disabled:opacity-35";

function searchKey(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").trim();
}

interface Props {
  ingredients: readonly ProductIngredient[];
  itemsClassName: string;
  renderIngredient: (ingredient: ProductIngredient) => ReactNode;
}

export default function SupplementPicker({ ingredients, itemsClassName, renderIngredient }: Props) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [category, setCategory] = useState<IngredientCategory | "all">("all");
  const canSearch = ingredients.length > PAGE_SIZE;
  const presentCategories = new Set(ingredients.map((ingredient) => ingredient.category ?? "autre"));
  const canFilter = canSearch && presentCategories.size > 1;
  const activeCategory = canFilter && category !== "all" && presentCategories.has(category) ? category : "all";
  const term = canSearch ? searchKey(query) : "";
  const matches = ingredients.filter((ingredient) =>
    (activeCategory === "all" || (ingredient.category ?? "autre") === activeCategory) &&
    (term === "" || searchKey(ingredient.name).includes(term)));
  const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * PAGE_SIZE;

  return (
    <div className="space-y-3">
      {canSearch && (
        <SearchBar
          value={query}
          placeholder="Rechercher un supplément…"
          onChange={(value) => {
            setQuery(value);
            setPage(0);
          }}
        />
      )}
      {canFilter && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Types de suppléments">
          {(["all", ...ingredientCategories.filter((entry) => presentCategories.has(entry))] as const).map((entry) => (
            <button
              key={entry}
              type="button"
              aria-pressed={activeCategory === entry}
              onClick={() => {
                setCategory(entry);
                setPage(0);
              }}
              className={`min-h-11 rounded-full border px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-[#E8C078] ${activeCategory === entry ? "border-[#E8C078] bg-[#352817] text-[#F7DCA9]" : "border-[#584634] text-[#D8C8B4] hover:border-[#D4A053]"}`}
            >
              {entry === "all" ? "Tous" : INGREDIENT_CATEGORY_LABELS[entry]}
            </button>
          ))}
        </div>
      )}
      {matches.length > 0 ? (
        <div className={itemsClassName}>
          {matches.slice(start, start + PAGE_SIZE).map(renderIngredient)}
        </div>
      ) : (
        <p role="status" className="text-sm text-[#C8BDAE]">Aucun supplément ne correspond à cette recherche.</p>
      )}
      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-2" role="group" aria-label="Pages de suppléments">
          <button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className={pageButtonClass}>
            Précédents
          </button>
          <p aria-live="polite" className="text-center text-xs tabular-nums text-[#C8BDAE]">
            {start + 1}–{Math.min(start + PAGE_SIZE, matches.length)} sur {matches.length}
          </p>
          <button type="button" disabled={currentPage === pageCount - 1} onClick={() => setPage(currentPage + 1)} className={pageButtonClass}>
            Suivants
          </button>
        </div>
      )}
    </div>
  );
}
