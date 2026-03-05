import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offres et promotions — Pizza Deli'Zza",
  description:
    "Retrouvez les offres et promotions de Pizza Deli'Zza, votre pizzeria artisanale à La Varenne. Téléchargez l'application pour ne rien manquer !",
  alternates: { canonical: "/offers" },
};

export default function OffersPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 px-4 pt-16 pb-16 text-center">
      <span className="text-5xl">🍕</span>
      <h1 className="text-[28px] font-bold text-[#F5F5F5]">Offres à venir</h1>
      <p className="max-w-sm text-[15px] text-[#A0A0A0]">
        Les offres et promotions seront bientôt disponibles. Téléchargez
        l&apos;application pour être notifié !
      </p>
      <Link
        href="/download"
        className="inline-flex items-center justify-center rounded-[18px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] px-6 py-2.5 text-[15px] font-semibold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)] active:scale-95 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A053]"
      >
        Télécharger l&apos;application
      </Link>
    </div>
  );
}
