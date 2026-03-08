import type { Metadata } from "next";
import AuthPageClient from "./AuthPageClient";

export const metadata: Metadata = {
  title: "Connexion — Deli'Zza",
  description: "Connectez-vous ou créez un compte pour commander chez Deli'Zza.",
};

export default function AuthPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 bg-[#0D0D0D]">
      <div className="mb-8 text-center">
        <span className="text-[28px] font-bold text-[#F5F5F5]">
          Deli&apos;Zza
        </span>
      </div>
      <AuthPageClient />
    </div>
  );
}
