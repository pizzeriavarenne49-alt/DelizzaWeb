"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { homepagePromotionExpiryDelay } from "@/lib/homepage-promotion";
import { BUSINESS } from "@/lib/seo";
import { formatPrice } from "@/types";
import type { HomepagePromotion as Promotion } from "@/data/website-homepage";
import PizzaDuoVisual from "@/components/ui/PizzaDuoVisual";

export default function HomepagePromotion({ promotion }: { promotion: Promotion }) {
  const [visible, setVisible] = useState(() => !promotion.endsAt || Date.parse(promotion.endsAt) > Date.now());
  useEffect(() => {
    if (!promotion.endsAt) return;
    const end = Date.parse(promotion.endsAt);
    if (!Number.isFinite(end) || end <= Date.now()) return;
    let timer: number;
    const check = () => {
      if (end <= Date.now()) {
        setVisible(false);
      } else {
        timer = window.setTimeout(check, homepagePromotionExpiryDelay(end, Date.now()));
      }
    };
    timer = window.setTimeout(check, homepagePromotionExpiryDelay(end, Date.now()));
    return () => window.clearTimeout(timer);
  }, [promotion.endsAt]);
  if (!visible) return null;
  const href = promotion.action === "product" && promotion.productId
    ? `/menu?product=${encodeURIComponent(promotion.productId)}`
    : "/menu";
  return <section className={promotion.isDuo ? "home-promotion home-promotion--duo" : "home-promotion"} aria-labelledby="promotion-title">
    {promotion.visual.kind === "duo" ? (
      <div className="home-promotion-image home-promotion-cover">
        <div className="home-promotion-cover-plate">
          <PizzaDuoVisual left={promotion.visual.recipes[0]} right={promotion.visual.recipes[1]} variant="cover" imageSizes="(max-width: 767px) 76vw, 340px" />
        </div>
      </div>
    ) : (
      <div className="home-promotion-image"><Image src={`/api/home-promotion-image?path=${encodeURIComponent(promotion.visual.imageVersion)}`} alt="" fill unoptimized sizes="(max-width: 767px) 100vw, 50vw" className="object-cover" /></div>
    )}
    <div className="home-promotion-copy">
      <p className="home-eyebrow">{promotion.isDuo ? "Nouveau · Pizza Duo" : "À découvrir"}</p>
      <h2 id="promotion-title">{promotion.title}</h2>
      <p>{promotion.description}</p>
      {promotion.counterOnly && <p className="home-promotion-note">Disponible au comptoir et par téléphone.</p>}
      <div className="home-promotion-order">
        {promotion.priceCents !== null && <strong className="home-promotion-price">{formatPrice(promotion.priceCents)} €</strong>}
        {promotion.action === "counter"
          ? <a href={`tel:${BUSINESS.telephone.replaceAll(" ", "")}`} className="home-button home-button-primary">{promotion.buttonLabel}</a>
          : <Link href={href} className="home-button home-button-primary">{promotion.buttonLabel} <span aria-hidden="true">↗</span></Link>}
      </div>
    </div>
  </section>;
}
