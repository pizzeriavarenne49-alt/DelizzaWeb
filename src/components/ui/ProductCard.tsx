"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/cn";
import { motion } from "framer-motion";
import Image from "next/image";
import type { Product } from "@/types";
import type { CartItemCustomizations, SelectedOption } from "@/types/cart";
import { formatPrice } from "@/types";
import { track } from "@/analytics";
import { useCart } from "@/contexts/CartContext";
import PizzaDuoCustomizeModal from "@/components/ui/PizzaDuoCustomizeModal";
import { isDelizzaPizzaCategory, isPizzaDuoDevelopmentEnabled, isPizzaDuoProduct, isValidPizzaDuoProduct } from "@/lib/pizza-duo";
import { useOnlineOrderingStatus } from "@/contexts/OnlineOrderingStatusContext";
import { useToast } from "@/contexts/ToastContext";
const ProductCustomizeModal = dynamic(() => import("@/components/ui/ProductCustomizeModal"), { ssr: false });
import { isProductUnavailable } from "@/lib/product-availability";
import { recordMarketingEvent } from "@/marketing/marketing-client";
import { useLiveProduct } from "@/contexts/CatalogAvailabilityContext";

interface ProductCardProps {
  product: Product;
  pizzaDuoRecipes?: Product[];
  pizzaDuoWebEnabled?: boolean;
}

function hasProductCustomizations(product: Product): boolean {
  return (
    product.options.length > 0 ||
    product.appliedTemplateIds.length > 0 ||
    product.baseIngredientIds.length > 0 ||
    product.availableSupplementIds.length > 0
  );
}

export default function ProductCard({ product: initialProduct, pizzaDuoRecipes = [], pizzaDuoWebEnabled = false }: ProductCardProps) {
  const product = useLiveProduct(initialProduct);
  const { addItem, addItemWithOptions, addPizzaDuo, canAddProductQuantity } = useCart();
  const onlineOrdering = useOnlineOrderingStatus();
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const isUnavailable = isProductUnavailable(product);
  const orderingDisabled = !onlineOrdering.canStartOrder;
  const stockLimitReached = !canAddProductQuantity(product.id, 1, product);
  const hasCustomizations = hasProductCustomizations(product);
  const isDuo = isPizzaDuoProduct(product);
  const isClassicPizza = !isDuo && product.pizzaUnits === 1 && isDelizzaPizzaCategory(product.category);
  const hasValidDuoConfiguration = !isDuo || isValidPizzaDuoProduct(product);
  const duoIllustrations = isDuo ? pizzaDuoRecipes.filter((recipe) => !isProductUnavailable(recipe)).slice(0, 2) : [];
  const cannotOrder = isUnavailable || orderingDisabled || stockLimitReached || !hasValidDuoConfiguration;
  if (isDuo && !pizzaDuoWebEnabled && !isPizzaDuoDevelopmentEnabled()) return null;

  const handleAdd = () => {
    if (orderingDisabled) {
      showToast(onlineOrdering.message ?? "Les commandes en ligne sont indisponibles.");
      return;
    }
    if (!hasValidDuoConfiguration || isUnavailable || !canAddProductQuantity(product.id, 1, product)) {
      showToast(`${product.name} est indisponible`);
      return;
    }

    track({ name: "click_add_product", payload: { productId: product.id } });
    if (hasCustomizations || isDuo || isClassicPizza) {
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
    if (isUnavailable || !canAddProductQuantity(product.id, quantity, product)) {
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
      <motion.div
        data-seasonal-product=""
        whileTap={{ scale: 0.97 }}
        className={cn("relative rounded-[18px] bg-[#1A1A1A] shadow-[0_4px_16px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col transition-colors hover:bg-[#202020]", isDuo && "col-span-full sm:flex-row")}
      >
        {/* Image */}
        <div data-seasonal-product-image="" className={cn("relative aspect-[4/3] bg-[#252525]", isDuo && "sm:w-[46%] sm:shrink-0")}>
          {isDuo && duoIllustrations.length === 2 ? (
            <div className="grid h-full grid-cols-2 gap-px bg-[#0D0D0D]" aria-label="Illustration des deux moitiés disponibles">
              {duoIllustrations.map((recipe, index) => <div key={recipe.id} className="relative overflow-hidden"><Image src={recipe.image} alt={`Moitié ${index + 1} : ${recipe.name}`} fill sizes="(max-width: 768px) 50vw, 260px" className="object-cover" loading="lazy" /></div>)}
            </div>
          ) : <Image src={product.image} alt={product.name} fill sizes="(max-width: 768px) 50vw, 200px" className="object-cover" loading="lazy" />}
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
            <div className="relative z-20">
              <button
                type="button"
                onClick={handleAdd}
                disabled={cannotOrder}
                aria-label={
                  isUnavailable
                    ? `${product.name} indisponible`
                    : orderingDisabled
                      ? "Commandes en ligne indisponibles"
                      : stockLimitReached
                        ? `${product.name} : quantité maximale disponible atteinte`
                      : isDuo ? `Composer ${product.name}` : isClassicPizza ? `Personnaliser ${product.name}` : `Ajouter ${product.name} au panier`
                }
                className={cn(
                  "flex h-8 items-center justify-center rounded-full",
                  isDuo ? "min-w-[88px] px-2" : "w-8",
                  cannotOrder
                    ? "bg-[#3A3A3A] text-[#8A8A8A] cursor-not-allowed"
                    : "bg-gradient-to-br from-[#D4A053] to-[#E8C078] text-[#0D0D0D]",
                  "text-[18px] font-bold leading-none",
                  !cannotOrder && "shadow-[0_4px_20px_rgba(212,160,83,0.3)] active:scale-90",
                  "transition-transform",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A053]",
                )}
              >
                {cannotOrder ? "x" : isDuo ? <span className="px-2 text-[12px]">Composer</span> : "+"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {modalOpen && !isDuo && (
        <ProductCustomizeModal
          product={product}
          onClose={() => setModalOpen(false)}
          onConfirm={handleModalConfirm}
        />
      )}
      {modalOpen && isDuo && (
        <PizzaDuoCustomizeModal
          product={product}
          recipes={pizzaDuoRecipes}
          onClose={() => setModalOpen(false)}
          onConfirm={(duo, quantity) => {
            if (!hasValidDuoConfiguration || orderingDisabled || isUnavailable || !canAddProductQuantity(product.id, quantity, product)) return;
            addPizzaDuo(product, duo, quantity);
            showToast(`${product.name} ajouté au panier ✓`);
            setModalOpen(false);
          }}
        />
      )}
    </>
  );
}
