"use client";

import { useState, type ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import CartDrawer from "@/components/cart/CartDrawer";
import CartBadge from "@/components/cart/CartBadge";

interface ProvidersProps {
  children: ReactNode;
}

/** Client-side providers wrapping the site layout */
export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <CartProvider>{children}</CartProvider>
    </AuthProvider>
  );
}

/** Cart button that opens the drawer — rendered inside the nav components */
export function CartButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le panier"
        className="relative flex items-center justify-center"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
          <path d="M3 6h18M16 10a4 4 0 01-8 0" />
        </svg>
        <CartBadge />
      </button>
      <CartDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
