import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { existsSync } from "node:fs";
import { join } from "node:path";

export const metadata: Metadata = {
  title: "Commande en ligne temporairement indisponible | Pizza Deli'Zza",
  description:
    "Le site de commande en ligne Pizza Deli'Zza est temporairement indisponible. Consultez la carte et commandez par téléphone.",
  robots: { index: true, follow: true },
};

const phoneDisplay = "02 21 68 81 82";
const phoneHref = "tel:0221688182";
const menuImagePath = "/images/menu-delizza.webp";

function hasMenuImage(): boolean {
  return existsSync(join(process.cwd(), "public", "images", "menu-delizza.webp"));
}

export default function MaintenancePage() {
  const menuImageAvailable = hasMenuImage();

  return (
    <main className="min-h-screen bg-[#0D0D0D] px-4 py-8 text-[#F5F5F5] md:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col justify-between gap-10">
        <section className="grid flex-1 items-center gap-8 md:grid-cols-[1fr_0.9fr]">
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#D4A053]">
                Pizza Deli&apos;Zza
              </p>
              <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight text-[#F5F5F5] md:text-6xl">
                Commande en ligne temporairement indisponible
              </h1>
            </div>

            <div className="max-w-xl space-y-3 text-base leading-7 text-[#D8D8D8] md:text-lg">
              <p>
                Désolé, notre site de commande en ligne est temporairement indisponible.
              </p>
              <p>
                Vous pouvez consulter notre carte ci-dessous et passer commande directement
                par téléphone.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <a
                href={phoneHref}
                className="rounded-[22px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] px-5 py-4 text-center text-lg font-bold text-[#0D0D0D] shadow-[0_16px_40px_rgba(212,160,83,0.22)] transition-transform active:scale-[0.98]"
              >
                {phoneDisplay}
              </a>

              <div className="rounded-[22px] border border-white/10 bg-[#1A1A1A] px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A0A0A0]">
                  Horaires
                </p>
                <div className="mt-2 flex flex-col gap-2 text-lg font-semibold text-[#F5F5F5]">
                  <span>Lundi : fermé</span>
                  <span>Mardi : fermé</span>
                  <span>Mercredi : 18h30-21h30</span>
                  <span>Jeudi : 18h30-21h30</span>
                  <span>Vendredi : 18h00-22h00</span>
                  <span>Samedi : 18h00-22h00</span>
                  <span>Dimanche : 18h00-22h00</span>
                </div>
              </div>
            </div>
          </div>

          <aside className="rounded-[30px] border border-white/10 bg-[#161616] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            {menuImageAvailable ? (
              <Image
                src={menuImagePath}
                alt="Carte Pizza Deli'Zza"
                width={900}
                height={1200}
                priority
                className="h-auto w-full rounded-[22px] object-cover"
              />
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[22px] border border-dashed border-[#D4A053]/35 bg-[#0D0D0D] px-6 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#D4A053]">
                  Carte a venir
                </p>
                <p className="mt-4 max-w-xs text-sm leading-6 text-[#A0A0A0]">
                  La carte image n&apos;est pas encore disponible sur le site. Appelez-nous
                  pour connaître les pizzas disponibles et commander.
                </p>
              </div>
            )}
          </aside>
        </section>

        <footer className="flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-white/10 pt-5 text-sm text-[#A0A0A0]">
          <Link href="/mentions-legales" className="hover:text-[#F5F5F5]">
            Mentions légales
          </Link>
          <Link href="/privacy" className="hover:text-[#F5F5F5]">
            Confidentialité
          </Link>
          <Link href="/cgu" className="hover:text-[#F5F5F5]">
            CGU
          </Link>
        </footer>
      </div>
    </main>
  );
}
