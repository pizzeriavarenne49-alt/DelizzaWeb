"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("[Error boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <span className="text-[48px]" aria-hidden="true">😕</span>
      <div>
        <h1 className="text-[22px] font-bold text-[#F5F5F5]">
          Oups, quelque chose s&apos;est mal passé
        </h1>
        <p className="mt-2 text-[13px] text-[#A0A0A0]">
          Une erreur inattendue s&apos;est produite. Réessayez ou revenez à l&apos;accueil.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-[18px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] px-6 py-2.5 text-[15px] font-semibold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)] active:scale-95 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A053]"
        >
          Réessayer
        </button>
        <Link
          href="/"
          className="rounded-[18px] bg-[#1A1A1A] px-6 py-2.5 text-[15px] font-semibold text-[#F5F5F5] hover:bg-[#252525] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A053]"
        >
          Accueil
        </Link>
      </div>
    </div>
  );
}
