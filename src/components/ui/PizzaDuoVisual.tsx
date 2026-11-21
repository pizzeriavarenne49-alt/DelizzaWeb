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

/** Fixed plate composition for the classic and Duo configurators. */
export default function PizzaDuoVisual({ left, right, variant = "duo" }: { left?: Product; right?: Product; variant?: "duo" | "single" }) {
  const single = variant === "single";
  return <div className="mx-auto w-full max-w-[340px]" role="img" aria-label={single ? `Aperçu de ${left?.name ?? "votre pizza"}` : "Aperçu de votre Pizza Duo"}>
    <div className="relative aspect-square overflow-hidden rounded-full border-[3px] border-[#ad824d] bg-[#130f0a] shadow-[0_18px_34px_#000a,0_0_0_9px_#e4b87c0d]">
      <Half recipe={left} side="left" single={single} />
      {!single && <Half recipe={right} side="right" single={single} />}
      {!single && <div aria-hidden="true" className="absolute inset-y-[4%] left-1/2 border-l border-dashed border-[#ffe7bf]/90 before:absolute before:-left-[3px] before:top-0 before:size-[5px] before:rounded-full before:bg-[#ffe7bf] after:absolute after:-left-[3px] after:bottom-0 after:size-[5px] after:rounded-full after:bg-[#ffe7bf]" />}
    </div>
    {!single && <div className="mt-3 grid grid-cols-2 gap-2 text-center text-[11px] font-semibold uppercase tracking-[.13em] text-[#d9bd86]">
      <span className="truncate">{left?.name ?? "Première moitié"}</span>
      <span className="truncate">{right?.name ?? "Deuxième moitié"}</span>
    </div>}
  </div>;
}
