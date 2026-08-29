"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useCart } from "@/contexts/CartContext";
import { useOnlineOrderingStatus } from "@/contexts/OnlineOrderingStatusContext";
import {
  assessCartAvailability,
  type CartAvailabilityIssue,
} from "@/lib/cart-availability";
import { formatPrice, formatTaxRate } from "@/types";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

const MINIMUM_ORDER_CENTS = 900;

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const onlineOrdering = useOnlineOrderingStatus();
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
  const remainingMinimumCents = Math.max(0, MINIMUM_ORDER_CENTS - total);
  const orderingBlocked = !onlineOrdering.canStartOrder;
  const [cartIssues, setCartIssues] = useState<CartAvailabilityIssue[]>([]);
  const [cartCheckLoading, setCartCheckLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (items.length === 0) {
      setCartIssues([]);
      setCartCheckLoading(false);
      return;
    }

    let cancelled = false;
    setCartCheckLoading(true);

    assessCartAvailability(items)
      .then((result) => {
        if (!cancelled) {
          setCartIssues(result.issues);
        }
      })
      .catch((error) => {
        console.error("[cart] Unable to validate cart availability:", error);
        if (!cancelled) {
          setCartIssues([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCartCheckLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [items, open]);

  const issuesByCartKey = useMemo(
    () => new Map(cartIssues.map((issue) => [issue.cartKey, issue])),
    [cartIssues],
  );
  const checkoutBlocked =
    remainingMinimumCents > 0 ||
    orderingBlocked ||
    cartCheckLoading ||
    cartIssues.length > 0;

  if (typeof window === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />

          <motion.aside
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 bottom-0 z-[9999] flex w-full max-w-sm flex-col bg-[#1A1A1A] shadow-[-8px_0_32px_rgba(0,0,0,0.5)]"
            aria-label="Panier"
          >
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <h2 className="text-[18px] font-bold text-[#F5F5F5]">Mon panier</h2>
              <button
                onClick={onClose}
                aria-label="Fermer le panier"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#252525] text-[#A0A0A0] transition-colors hover:text-[#F5F5F5]"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {isEmpty ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-16 w-16 text-[#3A3A3A]" aria-hidden="true">
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3 6h18M16 10a4 4 0 01-8 0" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-[15px] text-[#A0A0A0]">Votre panier est vide</p>
                  <button
                    onClick={onClose}
                    className="mt-2 rounded-full border border-[#D4A053]/40 px-5 py-2 text-[13px] text-[#D4A053] transition-colors hover:bg-[#D4A053]/10"
                  >
                    Voir le menu
                  </button>
                </div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {items.map((item) => {
                    const issue = issuesByCartKey.get(item.cartKey);
                    return (
                      <li
                        key={item.cartKey}
                        className={`rounded-[16px] px-4 py-3 ${
                          issue
                            ? "border border-[#E74C3C]/30 bg-[#E74C3C]/10"
                            : "bg-[#252525]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-[14px] font-medium leading-snug text-[#F5F5F5]">
                              {issue ? issue.displayLabel : item.nameSnapshot}
                            </span>
                            {issue && (
                              <p className="mt-1 text-[12px] leading-snug text-[#F59B90]">
                                {issue.message}
                              </p>
                            )}
                            {item.selectedOptions && item.selectedOptions.length > 0 && (
                              <div className="mt-0.5 flex flex-col gap-0.5">
                                {item.selectedOptions.map((opt) => (
                                  <span key={opt.optionId} className="text-[12px] leading-snug text-[#A0A0A0]">
                                    {opt.optionName}: {opt.choiceNames.join(", ")}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="whitespace-nowrap text-[14px] font-semibold text-[#D4A053]">
                            {formatPrice(item.totalCents)}&nbsp;€
                          </span>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[12px] text-[#A0A0A0]">
                            {formatPrice(item.unitPriceCents)}&nbsp;€ / unité
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => removeItem(item.cartKey)}
                              aria-label="Diminuer la quantité"
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1A1A1A] text-[16px] font-bold leading-none text-[#A0A0A0] transition-colors hover:text-[#F5F5F5]"
                            >
                              -
                            </button>
                            <span className="w-6 text-center text-[14px] font-semibold text-[#F5F5F5]">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}
                              disabled={!!issue}
                              aria-label="Augmenter la quantité"
                              className={`flex h-7 w-7 items-center justify-center rounded-full text-[16px] font-bold leading-none ${
                                issue
                                  ? "cursor-not-allowed bg-[#3A3A3A] text-[#8A8A8A]"
                                  : "bg-gradient-to-br from-[#D4A053] to-[#E8C078] text-[#0D0D0D]"
                              }`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {!isEmpty && (
              <div className="border-t border-white/5 px-5 py-5">
                <div className="mb-4 flex flex-col gap-1.5">
                  <div className="flex justify-between text-[13px] text-[#A0A0A0]">
                    <span>Sous-total TTC</span>
                    <span>{formatPrice(subtotal)}&nbsp;€</span>
                  </div>
                  {taxBreakdown.map((entry) => (
                    <div key={entry.rateBps} className="flex justify-between text-[13px] text-[#A0A0A0]">
                      <span>dont TVA ({formatTaxRate(entry.rateBps)}%)</span>
                      <span>{formatPrice(entry.taxCents)}&nbsp;€</span>
                    </div>
                  ))}
                  <div className="mt-1 flex justify-between text-[16px] font-bold text-[#F5F5F5]">
                    <span>Total TTC</span>
                    <span className="text-[#D4A053]">{formatPrice(total)}&nbsp;€</span>
                  </div>
                </div>

                <div className="flex justify-between text-[13px] font-semibold text-[#F5F5F5]">
                  <span>Commande minimum</span>
                  <span>9&nbsp;€</span>
                </div>
                {remainingMinimumCents > 0 && (
                  <p className="text-[13px] leading-relaxed text-[#E74C3C]">
                    Ajoutez {formatPrice(remainingMinimumCents)} € pour atteindre le minimum de commande de 9 €.
                  </p>
                )}
                {cartCheckLoading && (
                  <p className="text-[13px] leading-relaxed text-[#A0A0A0]">
                    Vérification des articles en cours...
                  </p>
                )}
                {cartIssues.map((issue) => (
                  <p key={issue.cartKey} className="text-[13px] leading-relaxed text-[#E74C3C]">
                    {issue.message}
                  </p>
                ))}
                {orderingBlocked && (
                  <p className="text-[13px] leading-relaxed text-[#E74C3C]">
                    {onlineOrdering.message}
                  </p>
                )}

                <div className="flex flex-col gap-2">
                  {checkoutBlocked ? (
                    <button
                      type="button"
                      disabled
                      className="block cursor-not-allowed rounded-[14px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] py-3.5 text-center text-[15px] font-semibold text-[#0D0D0D] opacity-50"
                    >
                      Commander
                    </button>
                  ) : (
                    <Link
                      href="/checkout"
                      onClick={onClose}
                      className="block rounded-[14px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] py-3.5 text-center text-[15px] font-semibold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)]"
                    >
                      Commander
                    </Link>
                  )}
                  <button
                    onClick={clearCart}
                    className="rounded-[14px] border border-white/10 py-2.5 text-[13px] text-[#A0A0A0] transition-colors hover:border-white/20 hover:text-[#F5F5F5]"
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
    document.body,
  );
}
