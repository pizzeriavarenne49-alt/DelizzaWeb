"use client";

import Image from "next/image";
import type { Product } from "@/types";

export type PizzaDuoVisualTransform = {
  scale: number;
  translateX: number;
  translateY: number;
};

const fourCheesesFrame = { scale: 1.02, translateX: 0, translateY: 0.9 };

// Frame the crust against the square object-cover crop used by both masks.
// Portrait photos can have more space beneath the pizza than above it.
const recipeTransforms: Record<string, PizzaDuoVisualTransform> = {
  bolognaise: { scale: 1.005, translateX: -0.8, translateY: -0.8 },
  chorizo: { scale: 1.17, translateX: 0.3, translateY: 2.3 },
  "chevre-miel": { scale: 1.12, translateX: 2.1, translateY: 0.8 },
  imperiale: { scale: 1.14, translateX: 0.2, translateY: 5.7 },
  kebab: { scale: 1.075, translateX: 0, translateY: 0.8 },
  margherita: { scale: 1.08, translateX: -2, translateY: 1 },
  montagnarde: { scale: 1.03, translateX: 0.2, translateY: -0.9 },
  norvegienne: { scale: 1.03, translateX: 0.2, translateY: 1.2 },
  "poulet-curry": { scale: 1.07, translateX: 0, translateY: 0 },
  "4-fromages": fourCheesesFrame,
  "quatre-fromages": fourCheesesFrame,
  reine: { scale: 1.04, translateX: 0.4, translateY: 0.5 },
};

/** Unknown catalogue photos use a neutral centred crop rather than arbitrary offsets. */
export function pizzaDuoVisualTransform(recipe?: Product): PizzaDuoVisualTransform {
  if (!recipe) return { scale: 1, translateX: 0, translateY: 0 };
  const known = recipeTransforms[recipe.slug] ?? recipeTransforms[recipe.id];
  if (known) return known;
  return { scale: 1.1, translateX: 0, translateY: 0 };
}

function Half({ recipe, side, single, sizes }: { recipe?: Product; side: "left" | "right"; single: boolean; sizes: string }) {
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
      sizes={sizes}
      className="object-cover"
      style={{ transform: `scale(${transform.scale}) translate(${transform.translateX}%, ${transform.translateY}%)` }}
    />
  </div>;
}

/** Fixed plate composition for the classic and Duo configurators. */
export default function PizzaDuoVisual({ left, right, variant = "duo", imageSizes }: { left?: Product; right?: Product; variant?: "duo" | "single" | "cover"; imageSizes?: string }) {
  const single = variant === "single";
  const cover = variant === "cover";
  const sizes = imageSizes ?? (cover ? "(max-width: 639px) 55vw, 226px" : "(max-width: 767px) 280px, 340px");
  const label = cover && left && right ? `Pizza Duo : une moitié ${left.name}, une moitié ${right.name}`
    : single ? `Aperçu de ${left?.name ?? "votre pizza"}` : "Aperçu de votre Pizza Duo";
  return <div className="mx-auto w-full max-w-[340px]" role="img" aria-label={label}>
    <div className="relative aspect-square overflow-hidden rounded-full border-[3px] border-[#ad824d] bg-[#130f0a] shadow-[0_18px_34px_#000a,0_0_0_9px_#e4b87c0d]">
      <Half recipe={left} side="left" single={single} sizes={sizes} />
      {!single && <Half recipe={right} side="right" single={single} sizes={sizes} />}
      {!single && <div aria-hidden="true" className="absolute inset-y-[4%] left-1/2 border-l border-dashed border-[#ffe7bf]/90 before:absolute before:-left-[3px] before:top-0 before:size-[5px] before:rounded-full before:bg-[#ffe7bf] after:absolute after:-left-[3px] after:bottom-0 after:size-[5px] after:rounded-full after:bg-[#ffe7bf]" />}
    </div>
    {!single && !cover && <div className="mt-3 grid grid-cols-2 gap-2 text-center text-[11px] font-semibold uppercase tracking-[.13em] text-[#d9bd86]">
      <span className="truncate">{left?.name ?? "Première moitié"}</span>
      <span className="truncate">{right?.name ?? "Deuxième moitié"}</span>
    </div>}
  </div>;
}
