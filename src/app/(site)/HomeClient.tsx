"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Carousel from "@/components/ui/Carousel";
import SearchBar from "@/components/ui/SearchBar";
import Chip from "@/components/ui/Chip";
import SectionHeader from "@/components/ui/SectionHeader";
import ProductCard from "@/components/ui/ProductCard";
import type { Product, Category } from "@/types";
import { track } from "@/analytics";
import { useAuth } from "@/contexts/AuthContext";

interface HomeClientProps {
  featuredProducts: Product[];
  categories: Category[];
  products: Product[];
}

export default function HomeClient({ featuredProducts, categories, products }: HomeClientProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("popular");
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    track({ name: "view_home" });
  }, []);

  const greeting = (() => {
    if (!user) return "Bienvenue !";
    const rawName = user.displayName
      ? user.displayName.split(" ")[0]
      : user.email
        ? user.email.split("@")[0]
        : null;
    const name = rawName && /^[a-zA-ZÀ-ÿ]/.test(rawName) ? rawName : null;
    return name ? `Bonjour ${name} !` : "Bienvenue !";
  })();

  const filtered =
    activeCategory === "popular"
      ? products.filter((p) => p.is_popular)
      : products.filter((p) => p.category === activeCategory);

  const searched = search
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.description_short.toLowerCase().includes(search.toLowerCase()),
      )
    : filtered;

  return (
    <div className="flex flex-col gap-6 px-4 pt-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#F5F5F5]">
            Deli&apos;Zza
          </h1>
          <p className="text-[13px] text-[#A0A0A0]">{greeting}</p>
        </div>
        <Link
          href="/profile"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#252525] text-[15px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4A053]"
          aria-label="Voir le profil"
        >
          👤
        </Link>
      </header>

      {/* Hero carousel */}
      <section aria-label="Offres à la une">
        <Carousel products={featuredProducts} />
      </section>

      {/* Search bar */}
      <SearchBar value={search} onChange={setSearch} />

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

      {/* Suggestions */}
      <section className="flex flex-col gap-4" aria-label="Suggestions">
        <SectionHeader
          title="Suggestions"
          action="Voir tout"
          onAction={() => router.push("/menu")}
        />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {searched.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
          {searched.length === 0 && (
            <p className="col-span-2 py-10 text-center text-[#6B6B6B]">
              Aucun résultat trouvé
            </p>
          )}
        </div>
      </section>

      {/* CTA section */}
      <section className="rounded-[24px] bg-gradient-to-br from-[#1A1A1A] to-[#252525] p-5 text-center">
        <p className="text-[13px] text-[#A0A0A0]">
          Envie de plus ? Découvrez tout le menu
        </p>
        <Link
          href="/menu"
          className="mt-3 inline-flex items-center justify-center rounded-[18px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] px-6 py-2.5 text-[15px] font-semibold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)] active:scale-95 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A053]"
        >
          Voir le menu complet
        </Link>
      </section>
    </div>
  );
}
