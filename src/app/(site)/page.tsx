"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Carousel from "@/components/ui/Carousel";
import SearchBar from "@/components/ui/SearchBar";
import Chip from "@/components/ui/Chip";
import SectionHeader from "@/components/ui/SectionHeader";
import ProductCard from "@/components/ui/ProductCard";
import { heroSlides, categories, products } from "@/data/mock";
import Link from "next/link";
import { buildGoUrl } from "@/lib/redirect";

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("popular");
  const router = useRouter();

  const filtered =
    activeCategory === "popular"
      ? products.slice(0, 6)
      : products.filter((p) => p.categoryId === activeCategory);

  const searched = search
    ? filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.description.toLowerCase().includes(search.toLowerCase()),
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
          <p className="text-[13px] text-[#A0A0A0]">Bonjour Alex,</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#252525] text-[15px]">
          👤
        </div>
      </header>

      {/* Hero carousel */}
      <section>
        <Carousel slides={heroSlides} />
      </section>

      {/* Search bar */}
      <SearchBar value={search} onChange={setSearch} />

      {/* Category chips */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto -mx-4 px-4">
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

      {/* Suggestions */}
      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Suggestions"
          action="Voir tout"
          onAction={() => router.push("/menu")}
        />
        <div className="grid grid-cols-2 gap-3">
          {searched.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* CTA section */}
      <section className="rounded-[24px] bg-gradient-to-br from-[#1A1A1A] to-[#252525] p-5 text-center">
        <p className="text-[13px] text-[#A0A0A0]">
          Envie de plus ? Découvrez tout le menu
        </p>
        <Link
          href={buildGoUrl("see_menu")}
          className="mt-3 inline-flex items-center justify-center rounded-[18px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] px-6 py-2.5 text-[15px] font-semibold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)] active:scale-95 transition-transform"
        >
          Voir le menu complet
        </Link>
      </section>
    </div>
  );
}
