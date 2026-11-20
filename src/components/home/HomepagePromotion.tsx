"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BUSINESS } from "@/lib/seo";
import { formatPrice } from "@/types";
import type { HomepagePromotion as Promotion } from "@/data/website-homepage";

export default function HomepagePromotion({ promotion }: { promotion: Promotion }) {
  const [visible, setVisible] = useState(() => !promotion.endsAt || Date.parse(promotion.endsAt) > Date.now());
  useEffect(() => {
    if (!promotion.endsAt) return;
    const delay = Date.parse(promotion.endsAt) - Date.now();
    if (delay <= 0) return;
    const timer = window.setTimeout(() => setVisible(false), delay);
    return () => window.clearTimeout(timer);
  }, [promotion.endsAt]);
  if (!visible) return null;
  const href = promotion.action === "product" && promotion.productId
    ? `/menu?product=${encodeURIComponent(promotion.productId)}`
    : "/menu";
  return <section className="home-promotion" aria-labelledby="promotion-title">
    <div className="home-promotion-image"><Image src={`/api/home-promotion-image?path=${encodeURIComponent(promotion.imageVersion)}`} alt="" fill sizes="(max-width: 767px) 100vw, 50vw" className="object-cover" /></div>
    <div className="home-promotion-copy">
      <p className="home-eyebrow">À découvrir</p>
      <h2 id="promotion-title">{promotion.title}</h2>
      <p>{promotion.description}</p>
      {promotion.priceCents !== null && <strong className="home-promotion-price">{formatPrice(promotion.priceCents)} €</strong>}
      {promotion.counterOnly && <p className="home-promotion-note">Disponible au comptoir et par téléphone.</p>}
      {promotion.action === "counter"
        ? <a href={`tel:${BUSINESS.telephone.replaceAll(" ", "")}`} className="home-button home-button-primary">{promotion.buttonLabel}</a>
        : <Link href={href} className="home-button home-button-primary">{promotion.buttonLabel} <span aria-hidden="true">↗</span></Link>}
    </div>
  </section>;
}
