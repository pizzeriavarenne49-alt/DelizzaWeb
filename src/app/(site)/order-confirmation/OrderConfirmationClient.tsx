"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center px-4 py-12 text-center">
      {/* Success icon */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#D4A053] to-[#E8C078] shadow-[0_8px_32px_rgba(212,160,83,0.4)]">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-10 w-10 text-[#0D0D0D]"
          aria-hidden="true"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>

      <h1 className="text-[26px] font-extrabold text-[#F5F5F5] mb-2">
        Commande confirmée !
      </h1>
      <p className="text-[15px] text-[#A0A0A0] mb-1">
        Merci pour votre commande chez Deli&apos;Zza.
      </p>
      <p className="text-[15px] text-[#A0A0A0] mb-6">
        Vous recevrez une confirmation par e-mail.
      </p>

      {orderId && (
        <div className="mb-8 rounded-[18px] bg-[#1A1A1A] px-6 py-4">
          <p className="text-[12px] text-[#6B6B6B] uppercase tracking-widest mb-1">
            Référence commande
          </p>
          <p className="text-[14px] font-mono text-[#D4A053]">{orderId}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href="/menu"
          className="block rounded-[18px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] py-4 text-[15px] font-bold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)]"
        >
          Voir le menu
        </Link>
        <Link
          href="/"
          className="block rounded-[18px] border border-white/10 py-3.5 text-[14px] text-[#A0A0A0] hover:text-[#F5F5F5] hover:border-white/20 transition-colors"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}

export default function OrderConfirmationClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0D0D0D]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4A053] border-t-transparent" />
        </div>
      }
    >
      <OrderConfirmationContent />
    </Suspense>
  );
}
