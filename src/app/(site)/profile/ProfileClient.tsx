"use client";

import { useEffect } from "react";
import Link from "next/link";
import { track } from "@/analytics";

export default function ProfileClient() {
  useEffect(() => {
    track({ name: "view_profile" });
  }, []);

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-8 px-6 text-center">
      {/* App icon */}
      <div
        className="flex h-24 w-24 items-center justify-center rounded-[24px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] text-[48px] shadow-[0_8px_32px_rgba(212,160,83,0.3)]"
        aria-hidden="true"
      >
        📱
      </div>

      <div className="flex flex-col gap-3">
        <h1 className="text-[24px] font-bold text-[#F5F5F5]">
          Votre espace personnel
        </h1>
        <p className="text-[15px] text-[#A0A0A0] leading-relaxed max-w-xs">
          Téléchargez l&apos;application Deli&apos;Zza pour accéder à votre
          profil, vos commandes et bien plus.
        </p>
      </div>

      <Link
        href="/download"
        className="rounded-[18px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] px-8 py-4 text-[15px] font-semibold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)] active:scale-95 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A053]"
      >
        Télécharger l&apos;application
      </Link>
    </div>
  );
}
