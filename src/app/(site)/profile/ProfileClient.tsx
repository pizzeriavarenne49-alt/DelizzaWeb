"use client";

import { useEffect } from "react";
import Link from "next/link";
import { track } from "@/analytics";
import { useAuth } from "@/contexts/AuthContext";

export default function ProfileClient() {
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    track({ name: "view_profile" });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4A053] border-t-transparent" aria-label="Chargement" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-8 px-6 text-center">
        <div
          className="flex h-24 w-24 items-center justify-center rounded-[24px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] text-[48px] shadow-[0_8px_32px_rgba(212,160,83,0.3)]"
          aria-hidden="true"
        >
          👤
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="text-[24px] font-bold text-[#F5F5F5]">
            Mon profil
          </h1>
          <p className="text-[15px] text-[#A0A0A0] leading-relaxed max-w-xs">
            Connectez-vous pour accéder à votre espace personnel et suivre vos commandes.
          </p>
        </div>

        <Link
          href="/auth"
          className="rounded-[18px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] px-8 py-4 text-[15px] font-semibold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)] active:scale-95 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A053]"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-md mx-auto">
      <h1 className="text-[24px] font-bold text-[#F5F5F5]">Mon profil</h1>

      {/* Account info card */}
      <div className="rounded-[20px] bg-[#1A1A1A] px-5 py-5 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#D4A053] to-[#E8C078] text-[24px] font-bold text-[#0D0D0D]">
            {user.email && user.email.length > 0 ? user.email[0].toUpperCase() : "?"}
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[13px] text-[#A0A0A0]">Adresse e-mail</span>
            <span className="text-[15px] font-medium text-[#F5F5F5] truncate">{user.email}</span>
          </div>
        </div>
      </div>

      {/* Order history placeholder */}
      <div className="rounded-[20px] bg-[#1A1A1A] px-5 py-5 flex flex-col gap-3">
        <h2 className="text-[16px] font-semibold text-[#F5F5F5]">Mes commandes</h2>
        <p className="text-[14px] text-[#A0A0A0]">
          L&apos;historique de vos commandes sera disponible prochainement.
        </p>
      </div>

      {/* Logout */}
      <button
        onClick={signOut}
        className="rounded-[18px] border border-white/10 py-3.5 text-[15px] font-medium text-[#A0A0A0] hover:text-[#F5F5F5] hover:border-white/20 active:scale-95 transition-all"
      >
        Se déconnecter
      </button>
    </div>
  );
}
