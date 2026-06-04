import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS, LEGAL_ENTITY, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Mentions légales — Pizza Deli'Zza",
  description: "Mentions légales de DELIZZA, éditeur du site Pizza Deli'Zza.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/mentions-legales" },
  openGraph: {
    title: "Mentions légales — Pizza Deli'Zza",
    description: "Mentions légales de DELIZZA, éditeur du site Pizza Deli'Zza.",
    url: `${SITE_URL}/mentions-legales`,
  },
};

export default function MentionsLegalesPage() {
  const legal = LEGAL_ENTITY;
  const restaurantAddress = BUSINESS.address;

  return (
    <article className="flex flex-col gap-8 px-4 pt-6 pb-10">
      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-medium text-[#D4A053] uppercase tracking-widest">
          Légal
        </p>
        <h1 className="text-[26px] font-bold text-[#F5F5F5] leading-tight">
          Mentions légales
        </h1>
        <p className="text-[14px] text-[#6B6B6B]">
          Informations relatives à l&apos;éditeur du site et à son hébergement.
        </p>
      </div>

      <Section title="Éditeur du site">
        <InfoCard>
          <p className="font-semibold text-[#F5F5F5]">{legal.denomination}</p>
          <p>{legal.legalForm}</p>
          <p>Capital social : {legal.shareCapital}</p>
          <p>SIREN : {legal.siren}</p>
          <p>SIRET : {legal.siret}</p>
          <p>Code APE : {legal.apeCode}</p>
          <p>
            Siège social : {legal.registeredOffice.streetAddress},{" "}
            {legal.registeredOffice.postalCode} {legal.registeredOffice.addressLocality},{" "}
            {legal.registeredOffice.addressCountry}
          </p>
        </InfoCard>
      </Section>

      <Section title="Directeur de publication">
        <InfoCard>
          <p className="font-semibold text-[#F5F5F5]">{legal.publicationDirector}</p>
          <p>{legal.publicationDirectorRole}</p>
        </InfoCard>
      </Section>

      <Section title="Contact">
        <InfoCard>
          <p>
            Email :{" "}
            <a
              href={`mailto:${legal.email}`}
              className="text-[#D4A053] underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              {legal.email}
            </a>
          </p>
          <p>Téléphone : {legal.telephone}</p>
        </InfoCard>
      </Section>

      <Section title="Hébergeur">
        <InfoCard>
          <p className="font-semibold text-[#F5F5F5]">{legal.host.name}</p>
          <p>{legal.host.streetAddress}</p>
          <p>{legal.host.addressLocality}</p>
          <p>{legal.host.addressCountry}</p>
          <p>
            Site :{" "}
            <a
              href={legal.host.website}
              className="text-[#D4A053] underline underline-offset-2 hover:opacity-80 transition-opacity"
              rel="noreferrer"
              target="_blank"
            >
              {legal.host.website}
            </a>
          </p>
        </InfoCard>
      </Section>

      <Section title="Adresse restaurant / retrait client">
        <InfoCard>
          <p className="font-semibold text-[#F5F5F5]">{BUSINESS.name}</p>
          <p>{restaurantAddress.streetAddress}</p>
          <p>
            {restaurantAddress.postalCode} {restaurantAddress.addressLocality}
          </p>
          <p>France</p>
          <p className="pt-2">
            Cette adresse est le point de retrait client des commandes à emporter. Elle est
            différente du siège social légal indiqué ci-dessus.
          </p>
        </InfoCard>
      </Section>

      <div className="flex justify-center pt-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[14px] text-[#A0A0A0] hover:text-[#D4A053] transition-colors"
        >
          <span aria-hidden="true">←</span>
          Retour à l&apos;accueil
        </Link>
      </div>
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-[24px] bg-gradient-to-br from-[#1A1A1A] to-[#252525] p-6">
      <h2 className="text-[20px] font-semibold text-[#F5F5F5]">{title}</h2>
      <div className="flex flex-col gap-3 text-[15px] text-[#A0A0A0] leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function InfoCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[16px] bg-[#0D0D0D] border border-[#252525] p-4 flex flex-col gap-1 text-[14px]">
      {children}
    </div>
  );
}
