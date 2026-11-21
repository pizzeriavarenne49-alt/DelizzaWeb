"use client";

import Image from "next/image";
import type { Product } from "@/types";

export type PizzaDuoVisualTransform = {
  scale: number;
  translateX: number;
  translateY: number;
};

const recipeTransforms: Record<string, PizzaDuoVisualTransform> = {
  margherita: { scale: 1.08, translateX: -2, translateY: 1 },
  reine: { scale: 1.13, translateX: 1, translateY: -1 },
  chorizo: { scale: 1.15, translateX: 0, translateY: 1 },
  "4-fromages": { scale: 1.12, translateX: -1, translateY: 0 },
  "chevre-miel": { scale: 1.14, translateX: 1, translateY: -1 },
};

/** Unknown catalogue photos use a neutral centred crop rather than arbitrary offsets. */
export function pizzaDuoVisualTransform(recipe?: Product): PizzaDuoVisualTransform {
  if (!recipe) return { scale: 1, translateX: 0, translateY: 0 };
  const known = recipeTransforms[recipe.slug] ?? recipeTransforms[recipe.id];
  if (known) return known;
  return { scale: 1.1, translateX: 0, translateY: 0 };
}

function Half({ recipe, side, single }: { recipe?: Product; side: "left" | "right"; single: boolean }) {
  const transform = pizzaDuoVisualTransform(recipe);
  const mask = single ? "inset(0)" : side === "left"
    ? "polygon(0 0, 50% 0, 50% 100%, 0 100%)"
    : "polygon(50% 0, 100% 0, 100% 100%, 50% 100%)";
  if (!recipe) return <div className="absolute inset-0 bg-gradient-to-br from-[#453622] via-[#231b13] to-[#100e0b]" style={{ clipPath: mask }} />;
  return <div className="absolute inset-0 overflow-hidden" style={{ clipPath: mask }}>
    <Image
      src={recipe.image}
      alt=""
      fill
      sizes="(max-width: 767px) 280px, 340px"
      className="object-cover"
      style={{ transform: `scale(${transform.scale}) translate(${transform.translateX}%, ${transform.translateY}%)` }}
    />
  </div>;
}

/** Fixed plate composition used only by the Duo configuration flow. */
export default function PizzaDuoVisual({ left, right, variant = "duo" }: { left?: Product; right?: Product; variant?: "duo" | "single" }) {
  const single = variant === "single";
  return <div className="mx-auto w-full max-w-[340px]" role="img" aria-label={single ? `Aperçu de ${left?.name ?? "votre pizza"}` : "Aperçu de votre Pizza Duo"}>
    <div className="relative aspect-square overflow-hidden rounded-full border-[7px] border-[#c79b52] bg-[#130f0a] shadow-[0_18px_44px_rgba(0,0,0,.5),inset_0_0_0_3px_rgba(255,230,178,.35)]">
      <Half recipe={left} side="left" single={single} />
      {!single && <Half recipe={right} side="right" single={single} />}
      {!single && <div aria-hidden="true" className="absolute inset-y-[8%] left-1/2 w-px -translate-x-1/2 bg-[#f7dfa8]/80 shadow-[0_0_10px_rgba(255,220,156,.85)]" />}
      <div aria-hidden="true" className="absolute inset-[9%] rounded-full border border-white/20" />
    </div>
    <div className={`mt-3 grid ${single ? "grid-cols-1" : "grid-cols-2"} gap-2 text-center text-[11px] font-semibold uppercase tracking-[.13em] text-[#d9bd86]`}>
      <span className="truncate">{left?.name ?? (single ? "Votre pizza" : "Première moitié")}</span>
      {!single && <span className="truncate">{right?.name ?? "Deuxième moitié"}</span>}
    </div>
  </div>;
}
