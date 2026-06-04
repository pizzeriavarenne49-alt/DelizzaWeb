"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { track } from "@/analytics";
import { useAuth } from "@/contexts/AuthContext";
import {
  DEFAULT_REWARD_THRESHOLD,
  getLoyaltyState,
  type LoyaltyState,
} from "@/services/loyalty-service";

const WL_APP_ID = process.env.NEXT_PUBLIC_WL_APP_ID ?? process.env.WL_APP_ID ?? "d_lizza";

export default function ProfileClient() {
  const { user, loading, signOut } = useAuth();
  const [loyalty, setLoyalty] = useState<LoyaltyState | null>(null);
  const [loyaltyError, setLoyaltyError] = useState(false);

  useEffect(() => {
    track({ name: "view_profile" });
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;
    getLoyaltyState(WL_APP_ID, user.uid)
      .then((state) => {
        if (!cancelled) {
          setLoyalty(state);
          setLoyaltyError(false);
        }
      })
      .catch((err) => {
        console.error("[loyalty-service] Unable to load loyalty profile:", err);
        if (!cancelled) {
          setLoyalty(null);
          setLoyaltyError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

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

  const stampsBalance = loyalty?.account.stampsBalance ?? 0;
  const rewardsAvailable = loyalty?.account.rewardsAvailable ?? 0;
  const rewardThreshold = loyalty?.config.rewardThreshold ?? DEFAULT_REWARD_THRESHOLD;
  const progressPercent = Math.min(100, (stampsBalance / rewardThreshold) * 100);

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

      {/* Loyalty */}
      <div className="rounded-[20px] bg-[#1A1A1A] px-5 py-5 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-[16px] font-semibold text-[#F5F5F5]">Fidélité</h2>
            <p className="mt-1 text-[13px] text-[#A0A0A0]">
              1 pizza achetée = 1 tampon. 10 tampons = 1 pizza offerte.
            </p>
          </div>
          <div className="rounded-[16px] bg-[#252525] px-4 py-3 text-center">
            <p className="text-[22px] font-bold text-[#D4A053]">{stampsBalance}</p>
            <p className="text-[11px] uppercase tracking-wide text-[#6B6B6B]">tampons</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-[13px] text-[#A0A0A0]">
            <span>Progression</span>
            <span>{stampsBalance}/{rewardThreshold}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#252525]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#D4A053] to-[#E8C078]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="rounded-[16px] border border-white/10 px-4 py-3">
          <p className="text-[13px] text-[#A0A0A0]">Récompenses disponibles</p>
          <p className="mt-1 text-[18px] font-bold text-[#F5F5F5]">
            {rewardsAvailable} pizza{rewardsAvailable > 1 ? "s" : ""} offerte{rewardsAvailable > 1 ? "s" : ""}
          </p>
        </div>

        {loyaltyError && (
          <p className="text-[12px] text-[#6B6B6B]">
            Impossible de charger la fidélité pour le moment.
          </p>
        )}
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
