"use client";

import { useEffect } from "react";
import Image from "next/image";
import { offers } from "@/data/mock";
import { track } from "@/analytics";

export default function OffersPage() {
  useEffect(() => {
    track({ name: "view_offers" });
  }, []);

  return (
    <div className="flex flex-col gap-5 px-4 pt-4">
      <h1 className="text-[22px] font-bold text-[#F5F5F5]">Offres</h1>
      <p className="text-[13px] text-[#A0A0A0]">
        Profitez de nos promotions exclusives
      </p>

      <div className="flex flex-col gap-4">
        {offers.map((offer) => (
          <article
            key={offer.id}
            className="rounded-[18px] bg-[#1A1A1A] shadow-[0_4px_16px_rgba(0,0,0,0.4)] overflow-hidden"
          >
            <div className="relative aspect-[16/9] bg-[#252525]">
              <Image
                src={offer.image}
                alt={offer.title}
                fill
                sizes="(max-width: 768px) 100vw, 400px"
                className="object-cover"
                loading="lazy"
              />
              <span className="absolute top-3 right-3 rounded-full bg-gradient-to-br from-[#D4A053] to-[#E8C078] px-3 py-1 text-[13px] font-bold text-[#0D0D0D]">
                {offer.discount}
              </span>
            </div>
            <div className="p-4">
              <h2 className="text-[18px] font-semibold text-[#F5F5F5]">
                {offer.title}
              </h2>
              <p className="mt-1 text-[13px] text-[#A0A0A0]">
                {offer.description}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="rounded-full bg-[#252525] px-3 py-1 text-[12px] font-mono text-[#D4A053]">
                  {offer.code}
                </span>
                <span className="text-[11px] text-[#6B6B6B]">
                  Valable jusqu&apos;au{" "}
                  {new Date(offer.endAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
