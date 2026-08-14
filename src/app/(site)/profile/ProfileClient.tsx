"use client";

import { useEffect, useState } from "react";
import type React from "react";
import Link from "next/link";
import { track } from "@/analytics";
import { useAuth } from "@/contexts/AuthContext";
import { formatPrice } from "@/types";
import { normalizeFrenchPhone, formatFrenchPhone } from "@/lib/phone";
import {
  getCustomerProfile,
  listRecentCustomerOrders,
  updateCustomerProfile,
  type CustomerOrderSummary,
  type CustomerProfile,
} from "@/services/customer-profile-service";
import {
  DEFAULT_REWARD_THRESHOLD,
  getLoyaltyState,
  type LoyaltyState,
} from "@/services/loyalty-service";
import { syncDelizzaCustomerProfile } from "@/services/customer-session";

const WL_APP_ID = process.env.NEXT_PUBLIC_WL_APP_ID ?? process.env.WL_APP_ID ?? "d_lizza";

export default function ProfileClient() {
  const { user, loading, signOut } = useAuth();
  const [loyalty, setLoyalty] = useState<LoyaltyState | null>(null);
  const [profile, setProfile] = useState<CustomerProfile>({ displayName: "", phone: "" });
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    track({ name: "view_profile" });
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([
      getLoyaltyState(WL_APP_ID, user.uid),
      getCustomerProfile(user.uid),
      listRecentCustomerOrders(user.uid),
    ])
      .then(([loyaltyState, loadedProfile, recentOrders]) => {
        if (cancelled) return;
        setLoyalty(loyaltyState);
        setProfile({
          displayName: loadedProfile.displayName || user.displayName || "",
          phone: loadedProfile.phone,
        });
        setOrders(recentOrders);
      })
      .catch((err) => {
        console.error("[profile] Unable to load profile data:", {
          code: typeof err === "object" && err !== null ? (err as { code?: unknown }).code : undefined,
        });
        if (!cancelled) setError("Impossible de charger toutes les informations du profil.");
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const saveProfile = async () => {
    if (!user || saving) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const normalizedPhone = normalizeFrenchPhone(profile.phone);
      if (!profile.displayName.trim()) {
        setError("Le nom est obligatoire.");
        return;
      }
      if (!normalizedPhone) {
        setError("Indiquez un numéro de téléphone français valide.");
        return;
      }
      await syncDelizzaCustomerProfile({
        displayName: profile.displayName,
        phone: normalizedPhone,
      });
      await updateCustomerProfile(user.uid, {
        displayName: profile.displayName,
        phone: normalizedPhone,
      });
      setProfile((current) => ({ ...current, phone: normalizedPhone }));
      setMessage("Profil mis à jour.");
    } catch (err) {
      console.error("[profile] Unable to update profile:", {
        code: typeof err === "object" && err !== null ? (err as { code?: unknown }).code : undefined,
      });
      setError("La mise à jour du profil a échoué.");
    } finally {
      setSaving(false);
    }
  };

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
        <h1 className="text-[24px] font-bold text-[#F5F5F5]">Mon profil</h1>
        <p className="max-w-xs text-[15px] leading-relaxed text-[#A0A0A0]">
          Connectez-vous pour accéder à votre espace personnel et suivre vos commandes.
        </p>
        <Link href="/auth" className="rounded-[18px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] px-8 py-4 text-[15px] font-semibold text-[#0D0D0D]">
          Se connecter
        </Link>
      </div>
    );
  }

  const passages = loyalty?.account.stampsBalance ?? 0;
  const rewardsAvailable = loyalty?.account.rewardsAvailable ?? 0;
  const rewardThreshold = loyalty?.config.rewardThreshold ?? DEFAULT_REWARD_THRESHOLD;
  const progressPercent = Math.min(100, (passages / rewardThreshold) * 100);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-6">
      <h1 className="text-[24px] font-bold text-[#F5F5F5]">Mon profil</h1>

      <section className="flex flex-col gap-4 rounded-[20px] bg-[#1A1A1A] px-5 py-5">
        <h2 className="text-[16px] font-semibold text-[#F5F5F5]">Informations</h2>
        <Field label="Email">
          <input value={user.email ?? ""} readOnly className={inputClassName} />
          <p className="text-[12px] text-[#6B6B6B]">La modification de l&apos;email n&apos;est pas activée sur le site web.</p>
        </Field>
        <Field label="Nom">
          <input
            value={profile.displayName}
            onChange={(event) => setProfile((current) => ({ ...current, displayName: event.target.value }))}
            className={inputClassName}
          />
        </Field>
        <Field label="Téléphone">
          <input
            type="tel"
            value={formatFrenchPhone(profile.phone)}
            onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
            className={inputClassName}
          />
        </Field>
        {error && <p className="rounded-[10px] bg-red-900/30 px-4 py-2 text-[13px] text-red-400">{error}</p>}
        {message && <p className="rounded-[10px] bg-[#2ECC71]/10 px-4 py-2 text-[13px] text-[#8FE6B1]">{message}</p>}
        <button
          type="button"
          onClick={saveProfile}
          disabled={saving}
          className="rounded-[14px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] py-3 text-[15px] font-semibold text-[#0D0D0D] disabled:opacity-60"
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
        <Link href="/auth" className="text-[13px] text-[#D4A053] underline">
          Changer ou récupérer mon mot de passe
        </Link>
      </section>

      <section className="flex flex-col gap-4 rounded-[20px] bg-[#1A1A1A] px-5 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-[16px] font-semibold text-[#F5F5F5]">Fidélité</h2>
            <p className="mt-1 text-[13px] text-[#A0A0A0]">
              1 commande éligible payée = 1 passage. 10 passages = 1 pizza offerte.
            </p>
          </div>
          <div className="rounded-[16px] bg-[#252525] px-4 py-3 text-center">
            <p className="text-[22px] font-bold text-[#D4A053]">{passages}</p>
            <p className="text-[11px] uppercase tracking-wide text-[#6B6B6B]">passages</p>
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#252525]">
          <div className="h-full rounded-full bg-gradient-to-r from-[#D4A053] to-[#E8C078]" style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="text-[14px] text-[#F5F5F5]">
          Récompenses disponibles : {rewardsAvailable}
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-[20px] bg-[#1A1A1A] px-5 py-5">
        <h2 className="text-[16px] font-semibold text-[#F5F5F5]">Mes commandes</h2>
        {orders.length === 0 ? (
          <p className="text-[14px] text-[#A0A0A0]">Aucune commande récente à afficher.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {orders.map((order) => (
              <li key={order.id} className="rounded-[14px] bg-[#252525] px-4 py-3 text-[13px] text-[#A0A0A0]">
                <div className="flex justify-between gap-3 text-[#F5F5F5]">
                  <span>{order.orderNumber}</span>
                  <span>{formatPrice(order.totalCents)} €</span>
                </div>
                <div className="mt-1 flex justify-between gap-3">
                  <span>{order.pickupLabel || order.createdAtLabel}</span>
                  <span>{order.status} / {order.paymentStatus}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        onClick={signOut}
        className="rounded-[18px] border border-white/10 py-3.5 text-[15px] font-medium text-[#A0A0A0] transition-all hover:border-white/20 hover:text-[#F5F5F5]"
      >
        Se déconnecter
      </button>
    </div>
  );
}

const inputClassName =
  "w-full rounded-[12px] border border-white/10 bg-[#252525] px-4 py-3 text-[15px] text-[#F5F5F5] outline-none transition-colors focus:border-[#D4A053] read-only:text-[#A0A0A0]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-[#A0A0A0]">{label}</span>
      {children}
    </label>
  );
}
