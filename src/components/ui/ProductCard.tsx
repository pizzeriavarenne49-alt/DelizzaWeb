"use client";

import { useState, type MouseEvent } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/cn";
import { motion } from "framer-motion";
import Image from "next/image";
import type { Product } from "@/types";
import type { CartItemCustomizations, SelectedOption } from "@/types/cart";
import { formatPrice } from "@/types";
import { track } from "@/analytics";
import { useCart } from "@/contexts/CartContext";
import { useOnlineOrderingStatus } from "@/contexts/OnlineOrderingStatusContext";
import { useToast } from "@/contexts/ToastContext";
const ProductCustomizeModal = dynamic(() => import("@/components/ui/ProductCustomizeModal"), { ssr: false });
import { isProductUnavailable } from "@/lib/product-availability";
import { recordMarketingEvent } from "@/marketing/marketing-client";
import { useLiveProduct } from "@/contexts/CatalogAvailabilityContext";

interface ProductCardProps {
  product: Product;
}

function hasProductCustomizations(product: Product): boolean {
  return (
    product.options.length > 0 ||
    product.appliedTemplateIds.length > 0 ||
    product.baseIngredientIds.length > 0 ||
    product.availableSupplementIds.length > 0
  );
}

export default function ProductCard({ product: initialProduct }: ProductCardProps) {
  const product = useLiveProduct(initialProduct);
  const { addItem, addItemWithOptions } = useCart();
  const onlineOrdering = useOnlineOrderingStatus();
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const isUnavailable = isProductUnavailable(product);
  const orderingDisabled = !onlineOrdering.canStartOrder;
  const cannotOrder = isUnavailable || orderingDisabled;
  const hasCustomizations = hasProductCustomizations(product);

  const handleAdd = () => {
    if (orderingDisabled) {
      showToast(onlineOrdering.message ?? "Les commandes en ligne sont indisponibles.");
      return;
    }
    if (isUnavailable) {
      showToast(`${product.name} est indisponible`);
      return;
    }

    track({ name: "click_add_product", payload: { productId: product.id } });
    if (hasCustomizations) {
      setModalOpen(true);
    } else {
      addItem(product);
      showToast(`${product.name} ajouté au panier ✓`);
    }
  };

  const openDetails = () => {
    // A product view represents an explicit product-detail consultation. This
    // is intentionally not tied to initial card visibility before consent.
    recordMarketingEvent("product_view", { productId: product.id, path: window.location.pathname });
    setModalOpen(true);
  };

  const handleAddClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    handleAdd();
  };

  const handleModalConfirm = (
    customizations: CartItemCustomizations,
    quantity: number,
    selectedOptions: SelectedOption[],
  ) => {
    if (orderingDisabled) {
      showToast(onlineOrdering.message ?? "Les commandes en ligne sont indisponibles.");
      setModalOpen(false);
      return;
    }
    if (isUnavailable) {
      showToast(`${product.name} est indisponible`);
      setModalOpen(false);
      return;
    }

    addItemWithOptions(product, customizations, quantity, selectedOptions);
    showToast(`${product.name} ajouté au panier ✓`);
    setModalOpen(false);
  };

  return (
    <>
      <motion.article
        data-seasonal-product=""
        whileTap={{ scale: 0.97 }}
        className="relative rounded-[18px] bg-[#1A1A1A] shadow-[0_4px_16px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col transition-colors hover:bg-[#202020]"
      >
        {/* Image */}
        <div data-seasonal-product-image="" className="relative aspect-[4/3] bg-[#252525]">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) calc((100vw - 44px) / 2), 200px"
            quality={60}
            className="object-cover"
            loading="lazy"
          />
          {product.badge && (
            <span className="absolute top-2 left-2 rounded-full bg-gradient-to-br from-[#D4A053] to-[#E8C078] px-2.5 py-0.5 text-[11px] font-semibold text-[#0D0D0D]">
              {product.badge}
            </span>
          )}
          {isUnavailable && (
            <span className="absolute top-2 right-2 rounded-full bg-[#B63228] px-2.5 py-0.5 text-[11px] font-semibold text-white">
              Rupture
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col justify-between p-3 gap-2">
          <div>
            <h3 className="text-[15px] font-semibold text-[#F5F5F5] leading-tight">
              <button type="button" onClick={openDetails} aria-label={`Voir le détail de ${product.name}`} className="text-left after:absolute after:inset-0 after:z-10 after:cursor-pointer focus-visible:outline-none focus-visible:after:rounded-[18px] focus-visible:after:outline-2 focus-visible:after:outline-[#D4A053]">
                {product.name}
              </button>
            </h3>
            <p className="mt-0.5 text-[12px] text-[#A0A0A0] line-clamp-2 leading-snug">
              {product.description_short}
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[15px] font-bold text-[#D4A053]">
              {hasCustomizations ? "dès " : ""}
              {formatPrice(product.price_cents)}&nbsp;€
            </span>
            <div
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={handleAddClick}
                disabled={cannotOrder}
                aria-label={
                  isUnavailable
                    ? `${product.name} indisponible`
                    : orderingDisabled
                      ? "Commandes en ligne indisponibles"
                      : `Ajouter ${product.name} au panier`
                }
                className={cn(
                  "relative z-20 flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                  cannotOrder
                    ? "bg-[#3A3A3A] text-[#8A8A8A] cursor-not-allowed"
                    : "bg-gradient-to-br from-[#D4A053] to-[#E8C078] text-[#0D0D0D]",
                  "text-[18px] font-bold leading-none",
                  !cannotOrder && "shadow-[0_4px_20px_rgba(212,160,83,0.3)] active:scale-90",
                  "transition-transform",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A053]",
                )}
              >
                {cannotOrder ? "x" : "+"}
              </button>
            </div>
          </div>
        </div>
      </motion.article>

      {modalOpen && (
        <ProductCustomizeModal
          product={product}
          onClose={() => setModalOpen(false)}
          onConfirm={handleModalConfirm}
        />
      )}
    </>
  );
}
