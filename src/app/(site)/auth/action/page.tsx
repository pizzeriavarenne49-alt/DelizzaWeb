import type { Metadata } from "next";
import AuthActionClient from "./AuthActionClient";

export const metadata: Metadata = {
  title: "Réinitialisation du mot de passe — Deli'Zza",
  description: "Choisissez un nouveau mot de passe pour votre compte Deli'Zza.",
  robots: { index: false, follow: false },
};

export default function AuthActionPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0D0D0D] px-4 py-12">
      <div className="mb-8 text-center">
        <span className="text-[28px] font-bold text-[#F5F5F5]">
          Deli&apos;Zza
        </span>
      </div>
      <AuthActionClient />
    </div>
  );
}
