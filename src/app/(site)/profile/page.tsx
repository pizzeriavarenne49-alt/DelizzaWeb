"use client";

import { useEffect } from "react";
import Link from "next/link";
import { track } from "@/analytics";

export default function ProfilePage() {
  useEffect(() => {
    track({ name: "view_profile" });
  }, []);

  return (
    <div className="flex flex-col gap-6 px-4 pt-4">
      <h1 className="text-[22px] font-bold text-[#F5F5F5]">Profil</h1>

      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#D4A053] to-[#E8C078] text-[32px]" aria-hidden="true">
          👤
        </div>
        <div className="text-center">
          <h2 className="text-[18px] font-semibold text-[#F5F5F5]">
            Alex Martin
          </h2>
          <p className="text-[13px] text-[#A0A0A0]">alex.martin@email.com</p>
        </div>
      </div>

      {/* Options */}
      <nav className="flex flex-col gap-2" aria-label="Options du profil">
        {[
          { label: "Mes commandes", icon: "📦" },
          { label: "Adresses", icon: "📍" },
          { label: "Paiement", icon: "💳" },
          { label: "Notifications", icon: "🔔" },
          { label: "Aide", icon: "❓" },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            className="flex w-full cursor-pointer items-center gap-3 rounded-[18px] bg-[#1A1A1A] px-4 py-4 hover:bg-[#252525] active:scale-[0.98] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4A053]"
          >
            <span className="text-[20px]" aria-hidden="true">{item.icon}</span>
            <span className="flex-1 text-left text-[15px] font-medium text-[#F5F5F5]">
              {item.label}
            </span>
            <svg
              className="h-4 w-4 text-[#6B6B6B]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        ))}
      </nav>

      {/* Download CTA */}
      <Link
        href="/download"
        className="mt-4 rounded-[18px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] px-6 py-4 text-center text-[15px] font-semibold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)] active:scale-95 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A053]"
      >
        Télécharger l&apos;application
      </Link>
    </div>
  );
}
