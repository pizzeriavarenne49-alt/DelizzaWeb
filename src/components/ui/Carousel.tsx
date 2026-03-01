"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import type { HeroSlide } from "@/types";
import { cn } from "@/lib/cn";
import { buildGoUrl } from "@/lib/redirect";
import { track } from "@/analytics";
import Link from "next/link";

interface CarouselProps {
  slides: HeroSlide[];
}

const AUTO_PLAY_MS = 5000;

export default function Carousel({ slides }: CarouselProps) {
  const activeSlides = slides
    .filter((s) => s.active)
    .sort((a, b) => a.order - b.order);

  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCurrent((p) => (p + 1) % activeSlides.length);
    }, AUTO_PLAY_MS);
  }, [activeSlides.length]);

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current, resetTimer]);

  const goTo = useCallback(
    (idx: number) => {
      setCurrent(idx);
      resetTimer();
    },
    [resetTimer],
  );

  const next = useCallback(() => goTo((current + 1) % activeSlides.length), [current, activeSlides.length, goTo]);
  const prev = useCallback(() => goTo((current - 1 + activeSlides.length) % activeSlides.length), [current, activeSlides.length, goTo]);

  const slide = activeSlides[current];
  if (!slide) return null;

  const handleCtaClick = () => {
    track({ name: "click_hero_cta", payload: { slideId: slide.id } });
  };

  return (
    <div
      className="relative overflow-hidden rounded-[24px] bg-[#1A1A1A]"
      role="region"
      aria-label="Offres à la une"
      aria-roledescription="carousel"
    >
      {/* Image area */}
      <div className="relative aspect-[16/10]">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="absolute inset-0"
            role="group"
            aria-roledescription="slide"
            aria-label={`${current + 1} sur ${activeSlides.length}: ${slide.title}`}
          >
            <Image
              src={slide.image}
              alt={slide.title}
              fill
              sizes="(max-width: 768px) 100vw, 600px"
              className="object-cover"
              priority={current === 0}
            />
            {/* Cinematic gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
          </motion.div>
        </AnimatePresence>

        {/* Badge */}
        <span className="absolute top-3 left-3 z-10 rounded-full bg-gradient-to-br from-[#D4A053] to-[#E8C078] px-3 py-1 text-[11px] font-bold text-[#0D0D0D] shadow-[0_2px_8px_rgba(212,160,83,0.4)]">
          {slide.badge}
        </span>

        {/* Price pill */}
        <span className="absolute top-3 right-3 z-10 rounded-full bg-[#0D0D0D]/70 backdrop-blur-sm border border-[#D4A053]/20 px-3 py-1 text-[13px] font-bold text-[#D4A053]">
          {slide.price.toFixed(2)}&nbsp;€
        </span>
      </div>

      {/* Bottom content */}
      <div className="px-4 pb-4 pt-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[#D4A053]">
          {slide.subtitle}
        </p>
        <h2 className="mt-1 text-[22px] font-bold text-[#F5F5F5]">
          {slide.title}
        </h2>

        <div className="mt-3 flex items-center justify-between">
          <Link
            href={buildGoUrl("hero_cta_" + slide.id)}
            onClick={handleCtaClick}
            className={cn(
              "inline-flex items-center justify-center rounded-[18px] px-6 py-2.5",
              "bg-gradient-to-br from-[#D4A053] to-[#E8C078] text-[15px] font-semibold text-[#0D0D0D]",
              "shadow-[0_4px_20px_rgba(212,160,83,0.3)] active:scale-95 transition-transform",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A053]",
            )}
          >
            {slide.ctaLabel}
          </Link>

          {/* Dots */}
          <div className="flex gap-1.5" role="tablist" aria-label="Slides">
            {activeSlides.map((s, i) => (
              <button
                key={s.id}
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
