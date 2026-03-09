"use client";

import { motion } from "framer-motion";
import { useCart } from "@/contexts/CartContext";

export default function CartBadge() {
  const { itemCount } = useCart();

  if (itemCount === 0) return null;

  return (
    <motion.span
      key={itemCount}
      initial={{ scale: 1.5 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-[#D4A053] to-[#E8C078] text-[10px] font-bold text-[#0D0D0D] leading-none"
      aria-label={`${itemCount} article${itemCount > 1 ? "s" : ""} dans le panier`}
    >
      {itemCount > 9 ? "9+" : itemCount}
    </motion.span>
  );
}
