"use client";

import { useCart } from "@/contexts/CartContext";

export default function CartBadge() {
  const { itemCount } = useCart();

  if (itemCount === 0) return null;

  return (
    <span
      className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-[#D4A053] to-[#E8C078] text-[10px] font-bold text-[#0D0D0D] leading-none"
      aria-label={`${itemCount} article${itemCount > 1 ? "s" : ""} dans le panier`}
    >
      {itemCount > 9 ? "9+" : itemCount}
    </span>
  );
}
