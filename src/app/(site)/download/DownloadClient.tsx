"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { track } from "@/analytics";

function DownloadContent() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? undefined;

  useEffect(() => {
    track({ name: "view_download", payload: { from } });
  }, [from]);

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-8 px-6 text-center">
      {/* Logo */}
      <div className="flex h-24 w-24 items-center justify-center rounded-[24px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] text-[48px] shadow-[0_8px_32px_rgba(212,160,83,0.3)]" aria-hidden="true">
        🍕
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-bold text-[#F5F5F5]">
          Deli&apos;Zza
        </h1>
        <p className="text-[15px] text-[#A0A0A0] leading-relaxed max-w-xs">
          Pour commander vos pizzas, rendez-vous sur le menu de notre site.
        </p>
      </div>

      {/* CTA */}
      <Link
        href="/menu"
        className="inline-flex items-center justify-center rounded-[18px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] px-8 py-3 text-[15px] font-semibold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)] active:scale-95 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A053]"
      >
        Commander sur le site
      </Link>

      <Link href="/" className="text-[13px] text-[#D4A053] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4A053] rounded">
        ← Retour au site
      </Link>
    </div>
  );
}

export default function DownloadClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#252525] border-t-[#D4A053]" />
        </div>
      }
    >
      <DownloadContent />
    </Suspense>
  );
}
