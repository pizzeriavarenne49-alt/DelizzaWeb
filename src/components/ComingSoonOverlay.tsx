"use client";

import { useEffect } from "react";

export default function ComingSoonOverlay() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999 }}
      className="flex flex-col items-center justify-center bg-[#0D0D0D] animate-coming-soon"
      aria-modal="true"
      role="dialog"
      aria-label="Ouverture prochaine"
    >
      {/* Pizza emoji */}
      <span className="text-6xl mb-6 select-none" aria-hidden="true">
        🍕
      </span>

      {/* Brand name */}
      <h1 className="text-4xl md:text-5xl font-bold text-[#E8A020] tracking-tight mb-3 text-center px-4">
        Pizza Deli&apos;Zza
      </h1>

      {/* Coming soon title */}
      <p className="text-sm md:text-base uppercase tracking-[0.25em] text-[#F5F5F5] font-medium mb-5 text-center px-4">
        Ouverture prochaine
      </p>

      {/* Separator */}
      <div className="w-16 h-px bg-[#E8A020] mb-5 opacity-70" aria-hidden="true" />

      {/* Sub-text */}
      <p className="text-[#A0A0A0] text-sm md:text-base text-center max-w-xs md:max-w-sm px-6 leading-relaxed">
        Le temps de chauffer le four…
        <br />
        Ouverture prochainement.
      </p>

      {/* Animated dots loader */}
      <div
        className="flex gap-2 mt-10"
        aria-label="Chargement"
        role="status"
      >
        <span className="w-2 h-2 rounded-full bg-[#E8A020] opacity-80 animate-[pulse_1.2s_ease-in-out_0s_infinite]" />
        <span className="w-2 h-2 rounded-full bg-[#E8A020] opacity-80 animate-[pulse_1.2s_ease-in-out_0.4s_infinite]" />
        <span className="w-2 h-2 rounded-full bg-[#E8A020] opacity-80 animate-[pulse_1.2s_ease-in-out_0.8s_infinite]" />
      </div>

      {/* Footer hint */}
      <p className="absolute bottom-6 text-xs text-[#6B6B6B] select-none" aria-hidden="true">
        On arrive bientôt 🍕
      </p>
    </div>
  );
}
