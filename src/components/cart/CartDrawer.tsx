"use client";

import { createPortal } from "react-dom";
import { useCart } from "@/contexts/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { formatPrice, computeTtcCents, formatTaxRate } from "@/types";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    getSubtotalCents,
    getTotalCents,
    getTaxBreakdown,
    isEmpty,
  } = useCart();

  const subtotal = getSubtotalCents();
  const total = getTotalCents();
  const taxBreakdown = getTaxBreakdown();

  if (typeof window === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.aside
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 bottom-0 z-[9999] flex w-full max-w-sm flex-col bg-[#1A1A1A] shadow-[-8px_0_32px_rgba(0,0,0,0.5)]"
            aria-label="Panier"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <h2 className="text-[18px] font-bold text-[#F5F5F5]">
                Mon panier
              </h2>
              <button
                onClick={onClose}
                aria-label="Fermer le panier"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#252525] text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {isEmpty ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-16 w-16 text-[#3A3A3A]" aria-hidden="true">
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3 6h18M16 10a4 4 0 01-8 0" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-[15px] text-[#A0A0A0]">Votre panier est vide</p>
                  <button
                    onClick={onClose}
                    className="mt-2 rounded-full border border-[#D4A053]/40 px-5 py-2 text-[13px] text-[#D4A053] hover:bg-[#D4A053]/10 transition-colors"
                  >
                    Voir le menu
                  </button>
                </div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {items.map((item) => (
                    <li
                      key={item.catalogItemId}
                      className="rounded-[16px] bg-[#252525] px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="flex-1 text-[14px] font-medium text-[#F5F5F5] leading-snug">
                          {item.nameSnapshot}
                        </span>
                        <span className="text-[14px] font-semibold text-[#D4A053] whitespace-nowrap">
                          {formatPrice(computeTtcCents(item.totalCents, item.taxRateBps))}&nbsp;€
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[12px] text-[#A0A0A0]">
                          {formatPrice(computeTtcCents(item.unitPriceCents, item.taxRateBps))}&nbsp;€ / unité
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => removeItem(item.catalogItemId)}
                            aria-label="Diminuer la quantité"
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1A1A1A] text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors text-[16px] font-bold leading-none"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-[14px] font-semibold text-[#F5F5F5]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.catalogItemId,
                                item.quantity + 1,
                              )
                            }
                            aria-label="Augmenter la quantité"
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#D4A053] to-[#E8C078] text-[#0D0D0D] text-[16px] font-bold leading-none"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer — only show when cart is not empty */}
            {!isEmpty && (
              <div className="border-t border-white/5 px-5 py-5">
                {/* Totals */}
                <div className="flex flex-col gap-1.5 mb-4">
                  <div className="flex justify-between text-[13px] text-[#A0A0A0]">
                    <span>Sous-total HT</span>
                    <span>{formatPrice(subtotal)}&nbsp;€</span>
                  </div>
                  {taxBreakdown.map((entry) => (
                    <div key={entry.rateBps} className="flex justify-between text-[13px] text-[#A0A0A0]">
                      <span>TVA ({formatTaxRate(entry.rateBps)}%)</span>
                      <span>{formatPrice(entry.taxCents)}&nbsp;€</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-[16px] font-bold text-[#F5F5F5] mt-1">
                    <span>Total TTC</span>
                    <span className="text-[#D4A053]">
                      {formatPrice(total)}&nbsp;€
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <Link
                    href="/checkout"
                    onClick={onClose}
                    className="block rounded-[14px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] py-3.5 text-center text-[15px] font-semibold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)]"
                  >
                    Commander
                  </Link>
                  <button
                    onClick={clearCart}
                    className="rounded-[14px] border border-white/10 py-2.5 text-[13px] text-[#A0A0A0] hover:text-[#F5F5F5] hover:border-white/20 transition-colors"
                  >
                    Vider le panier
                  </button>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
