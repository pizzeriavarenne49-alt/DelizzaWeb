"use client";

import { useEffect } from "react";
import Image from "next/image";
import type { Offer } from "@/types";
import { track } from "@/analytics";

interface OffersClientProps {
  offers: Offer[];
}

export default function OffersClient({ offers }: OffersClientProps) {
  useEffect(() => {
    track({ name: "view_offers" });
  }, []);

  return (
    <div className="flex flex-col gap-5 px-4 pt-4">
      <h1 className="text-[22px] font-bold text-[#F5F5F5]">Offres</h1>
      <p className="text-[13px] text-[#A0A0A0]">
        Profitez de nos promotions exclusives
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {offers.map((offer) => (
          <article
            key={offer.id}
            className="rounded-[18px] bg-[#1A1A1A] shadow-[0_4px_16px_rgba(0,0,0,0.4)] overflow-hidden"
          >
            {offer.image && (
              <div className="relative aspect-[16/9] bg-[#252525]">
                <Image
                  src={offer.image}
                  alt={offer.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 400px"
                  className="object-cover"
                  loading="lazy"
                />
              </div>
            )}
            <div className="p-4">
              <h2 className="text-[18px] font-semibold text-[#F5F5F5]">
                {offer.title}
              </h2>
              <p className="mt-1 text-[13px] text-[#A0A0A0]">
                {offer.content}
              </p>
              {offer.end_at && (
                <div className="mt-3 flex items-center justify-end">
                  <span className="text-[11px] text-[#6B6B6B]">
                    Valable jusqu&apos;au{" "}
                    {new Date(offer.end_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              )}
            </div>
          </article>
        ))}
        {offers.length === 0 && (
          <p className="py-10 text-center text-[#6B6B6B]">
            Aucune offre pour le moment
          </p>
        )}
      </div>
    </div>
  );
}
