"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import type { Product } from "@/types";
import { formatPrice, computeTtcCents } from "@/types";
import { cn } from "@/lib/cn";
import { track } from "@/analytics";
import Link from "next/link";

interface CarouselProps {
  products: Product[];
}

const AUTO_PLAY_MS = 5000;

export default function Carousel({ products }: CarouselProps) {
  const activeProducts = products.filter(
    (p) => p.active && p.image && !p.image.includes('placeholder'),
  );

  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (activeProducts.length === 0) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCurrent((p) => (p + 1) % activeProducts.length);
    }, AUTO_PLAY_MS);
  }, [activeProducts.length]);

  useEffect(() => {
    if (activeProducts.length === 0) return;
    resetTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current, resetTimer, activeProducts.length]);

  const goTo = useCallback(
    (idx: number) => {
      setCurrent(idx);
      resetTimer();
    },
    [resetTimer],
  );

  const next = useCallback(() => goTo((current + 1) % activeProducts.length), [current, activeProducts.length, goTo]);
  const prev = useCallback(() => goTo((current - 1 + activeProducts.length) % activeProducts.length), [current, activeProducts.length, goTo]);

  const product = activeProducts[current];
  if (!product) return null;

  const handleCtaClick = () => {
    track({ name: "click_hero_cta", payload: { slideId: product.id } });
  };

  return (
    <div
      className="relative overflow-hidden rounded-[24px] bg-[#1A1A1A]"
      role="region"
      aria-label="Offres à la une"
      aria-roledescription="carousel"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") prev();
        else if (e.key === "ArrowRight") next();
      }}
    >
      {/* Image area */}
      <div className="relative aspect-[16/10]">
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_e, info) => {
            if (info.offset.x < -50) next();
            else if (info.offset.x > 50) prev();
          }}
          aria-hidden="true"
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
        >
        <AnimatePresence mode="wait">
          <motion.div
            key={product.id}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="absolute inset-0"
            role="group"
            aria-roledescription="slide"
            aria-label={`${current + 1} sur ${activeProducts.length}: ${product.name}`}
          >
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 800px"
              className="object-cover"
              priority={current === 0}
            />
            {/* Cinematic gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
          </motion.div>
        </AnimatePresence>
        </motion.div>

        {/* Badge */}
        {product.badge && (
          <span className="absolute top-3 left-3 z-10 rounded-full bg-gradient-to-br from-[#D4A053] to-[#E8C078] px-3 py-1 text-[11px] font-bold text-[#0D0D0D] shadow-[0_2px_8px_rgba(212,160,83,0.4)]">
            {product.badge}
          </span>
        )}

        {/* Price pill */}
        {product.price_cents > 0 && (
          <span className="absolute top-3 right-3 z-10 rounded-full bg-[#0D0D0D]/70 backdrop-blur-sm border border-[#D4A053]/20 px-3 py-1 text-[13px] font-bold text-[#D4A053]">
            {formatPrice(computeTtcCents(product.price_cents, product.tax_rate_bps))}&nbsp;€
          </span>
        )}
      </div>

      {/* Bottom content */}
      <div className="px-4 pb-4 pt-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[#D4A053]">
          {product.description_short}
        </p>
        <h2 className="mt-1 text-[22px] font-bold text-[#F5F5F5]">
          {product.name}
        </h2>

        <div className="mt-3 flex items-center justify-between">
          <Link
            href="/menu"
            onClick={handleCtaClick}
            className={cn(
              "inline-flex items-center justify-center rounded-[18px] px-6 py-2.5",
              "bg-gradient-to-br from-[#D4A053] to-[#E8C078] text-[15px] font-semibold text-[#0D0D0D]",
              "shadow-[0_4px_20px_rgba(212,160,83,0.3)] active:scale-95 transition-transform",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A053]",
            )}
          >
            Voir le menu
          </Link>

          {/* Dots */}
          <div className="flex gap-1.5" role="tablist" aria-label="Slides">
            {activeProducts.map((p, i) => (
              <button
                key={p.id}
                onClick={() => goTo(i)}
                role="tab"
                aria-selected={i === current}
                aria-label={`Slide ${i + 1}`}
                className={cn(
                  "h-2 rounded-full transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4A053]",
                  i === current
                    ? "w-6 bg-[#D4A053]"
                    : "w-2 bg-[#6B6B6B] hover:bg-[#A0A0A0]",
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Swipe zones (tap arrows) */}
      <button
        onClick={prev}
        className="absolute left-0 top-0 h-full w-1/4 z-10"
        aria-label="Slide précédent"
      />
      <button
        onClick={next}
        className="absolute right-0 top-0 h-full w-1/4 z-10"
        aria-label="Slide suivant"
      />
    </div>
  );
}
