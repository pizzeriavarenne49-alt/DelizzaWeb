"use client";

import { cn } from "@/lib/cn";
import { motion } from "framer-motion";
import Image from "next/image";
import type { Product } from "@/types";
import { formatPrice } from "@/types";
import { track } from "@/analytics";
import { useCart } from "@/contexts/CartContext";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();

  const handleAdd = () => {
    track({ name: "click_add_product", payload: { productId: product.id } });
    addItem(product);
  };

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      className="rounded-[18px] bg-[#1A1A1A] shadow-[0_4px_16px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-[#252525]">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 200px"
          className="object-cover"
          loading="lazy"
        />
        {product.badge && (
          <span className="absolute top-2 left-2 rounded-full bg-gradient-to-br from-[#D4A053] to-[#E8C078] px-2.5 py-0.5 text-[11px] font-semibold text-[#0D0D0D]">
            {product.badge}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col justify-between p-3 gap-2">
        <div>
          <h3 className="text-[15px] font-semibold text-[#F5F5F5] leading-tight line-clamp-1">
            {product.name}
          </h3>
          <p className="mt-0.5 text-[12px] text-[#A0A0A0] line-clamp-2 leading-snug">
            {product.description_short}
          </p>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[15px] font-bold text-[#D4A053]">
            {formatPrice(product.price_cents)}&nbsp;€
          </span>
          <button
            type="button"
            onClick={handleAdd}
            aria-label={`Ajouter ${product.name} au panier`}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full",
              "bg-gradient-to-br from-[#D4A053] to-[#E8C078] text-[#0D0D0D]",
              "text-[18px] font-bold leading-none shadow-[0_4px_20px_rgba(212,160,83,0.3)]",
              "active:scale-90 transition-transform",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A053]",
            )}
          >
            +
          </button>
        </div>
      </div>
    </motion.div>
  );
}
