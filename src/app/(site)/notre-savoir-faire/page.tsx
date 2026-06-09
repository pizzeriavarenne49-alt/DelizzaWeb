import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, OG_IMAGE } from "@/lib/seo";
import { breadcrumbSchema } from "@/lib/schemas";
import JsonLd from "@/components/seo/JsonLd";

/* ------------------------------------------------------------------ */
/*  Metadata                                                           */
/* ------------------------------------------------------------------ */

export const metadata: Metadata = {
  title: "Notre savoir-faire | Pizza Deli'Zza",
  description:
    "Découvrez le savoir-faire de Pizza Deli'Zza : pâte avec maturation d'environ 24h, ingrédients sélectionnés avec soin et cuisson maîtrisée à La Varenne.",
  alternates: { canonical: "/notre-savoir-faire" },
  openGraph: {
    title: "Notre savoir-faire | Pizza Deli'Zza",
    description:
      "Découvrez comment Pizza Deli'Zza prépare ses pizzas à La Varenne : pâte avec maturation d'environ 24h, ingrédients sélectionnés avec soin et cuisson maîtrisée.",
    url: `${SITE_URL}/notre-savoir-faire`,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Pizza Deli'Zza - Savoir-faire" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Notre savoir-faire | Pizza Deli'Zza",
    description:
      "Pâte avec maturation d'environ 24h, ingrédients sélectionnés avec soin et cuisson maîtrisée. Le savoir-faire de Pizza Deli'Zza.",
    images: [OG_IMAGE],
  },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function NotreSavoirFairePage() {
  const breadcrumbs = [
    { name: "Accueil", href: "/" },
    { name: "Notre savoir-faire", href: "/notre-savoir-faire" },
  ];

  return (
    <>
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />

      <article className="flex flex-col gap-8 px-4 pt-6 pb-10">
        {/* ── H1 ── */}
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium text-[#D4A053] uppercase tracking-widest">
            Artisanat
          </p>
          <h1 className="text-[26px] font-bold text-[#F5F5F5] leading-tight">
            Notre savoir-faire
          </h1>
          <p className="text-[15px] text-[#A0A0A0] leading-relaxed">
            Chez Pizza Deli&apos;Zza, nous travaillons simplement et avec attention. Chaque pizza
            suit un processus clair, avec un soin particulier porté à la pâte, aux ingrédients et
            à la cuisson.
          </p>
        </div>

        {/* ── 1. La pâte ── */}
        <Section emoji="🌾" title="La pâte">
          <p>
            Chez Pizza Deli&apos;Zza, nous accordons une attention particulière à la pâte. Elle
            bénéficie d&apos;un temps de maturation d&apos;environ 24 heures au froid, afin de
            développer progressivement sa texture et ses arômes.
          </p>
          <p>
            Ce travail nous permet d&apos;obtenir une pâte plus équilibrée, avec une cuisson
            soignée et un résultat agréable en bouche. Nous continuons à affiner notre méthode
            pour proposer des pizzas toujours plus régulières et maîtrisées.
          </p>
        </Section>

        {/* ── 2. Des ingrédients sélectionnés avec soin ── */}
        <Section emoji="🥗" title="Des ingrédients sélectionnés avec soin">
          <p>
            Nous choisissons nos ingrédients avec attention pour construire des pizzas simples,
            gourmandes et cohérentes. L&apos;objectif est de proposer un bon équilibre entre pâte,
            sauce, fromage et garnitures, avec une préparation sérieuse et régulière.
          </p>
          <ul className="flex flex-col gap-2 pl-1">
            <Item>
              <strong className="text-[#F5F5F5]">Une base travaillée avec soin</strong> pour
              garder l&apos;équilibre de chaque recette.
            </Item>
            <Item>
              <strong className="text-[#F5F5F5]">Des légumes et garnitures choisis</strong> selon
              les besoins de la carte.
            </Item>
            <Item>
              <strong className="text-[#F5F5F5]">Une sauce tomate et des ingrédients</strong>{" "}
              sélectionnés pour offrir un résultat simple, efficace et gourmand.
            </Item>
            <Item>
              <strong className="text-[#F5F5F5]">Des recettes volontairement maîtrisées</strong>,
              sans chercher à en faire trop.
            </Item>
          </ul>
        </Section>

        {/* ── 3. La cuisson ── */}
        <Section emoji="🔥" title="La cuisson">
          <p>
            La cuisson est l&apos;étape finale qui révèle le travail en amont. Nos pizzas sont
            enfournées à <strong className="text-[#F5F5F5]">haute température</strong>, ce qui
            aide à obtenir une coloration homogène, des bords bien dorés et une base correctement
            cuite.
          </p>
          <p>
            Le résultat recherché est simple : une pizza bien cuite, servie avec une garniture à
            bonne température et une tenue régulière à la sortie du four.
          </p>
        </Section>

        {/* ── 4. Le click & collect ── */}
        <Section emoji="📱" title="Le click & collect">
          <p>
            Commander chez Pizza Deli&apos;Zza, c&apos;est simple et sans mauvaise surprise.
            Voici comment ça marche :
          </p>
          <ul className="flex flex-col gap-2 pl-1">
            <Item>
              Rendez-vous sur{" "}
              <Link
                href="/menu"
                className="text-[#D4A053] underline underline-offset-2 hover:opacity-80 transition-opacity"
              >
                notre menu en ligne
              </Link>{" "}
              et composez votre commande.
            </Item>
            <Item>Choisissez votre créneau de retrait et procédez au paiement sécurisé.</Item>
            <Item>
              Votre pizza est préparée à la commande - elle n&apos;est pas faite à l&apos;avance
              puis mise de côté.
            </Item>
            <Item>
              Venez chercher votre commande au{" "}
              <strong className="text-[#F5F5F5]">98 Place du Jardin Public à La Varenne</strong>{" "}
              à l&apos;heure prévue.
            </Item>
          </ul>
          <p>
            Pas de livraison, pas d&apos;intermédiaire. Le click &amp; collect nous permet de
            remettre la pizza dans de bonnes conditions, au moment du retrait.
          </p>
        </Section>

        {/* ── 5. Notre engagement ── */}
        <Section emoji="🤝" title="Notre engagement">
          <p>Chez Pizza Deli&apos;Zza, nous faisons des choix simples :</p>
          <ul className="flex flex-col gap-2 pl-1">
            <Item>
              <strong className="text-[#F5F5F5]">Préparer chaque pizza à la commande</strong>.
            </Item>
            <Item>
              <strong className="text-[#F5F5F5]">Travailler une carte volontairement resserrée</strong>.
            </Item>
            <Item>
              <strong className="text-[#F5F5F5]">Rechercher de la régularité</strong> dans les
              recettes et la cuisson.
            </Item>
            <Item>
              <strong className="text-[#F5F5F5]">Proposer une pizza généreuse</strong>, sérieuse
              et sans promesse inutile.
            </Item>
          </ul>
          <p>
            Nous préférons rester transparents sur notre façon de travailler : notre priorité est
            de proposer des pizzas bonnes, cohérentes et préparées avec soin, tout simplement.
          </p>
        </Section>

        {/* ── CTA ── */}
        <section className="flex flex-col items-center gap-3 rounded-[24px] bg-gradient-to-br from-[#1A1A1A] to-[#252525] p-6 text-center">
          <p className="text-[15px] text-[#A0A0A0]">Découvrez notre menu.</p>
          <Link
            href="/menu"
            className="inline-flex items-center justify-center rounded-[18px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] px-6 py-2.5 text-[15px] font-semibold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)] active:scale-95 transition-transform"
          >
            Voir le menu
          </Link>
        </section>
      </article>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper sub-components (local, no separate file needed)             */
/* ------------------------------------------------------------------ */

function Section({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-[24px] bg-gradient-to-br from-[#1A1A1A] to-[#252525] p-6">
      <div className="flex items-center gap-2">
        <span className="text-[20px]" aria-hidden="true">
          {emoji}
        </span>
        <h2 className="text-[20px] font-semibold text-[#F5F5F5]">{title}</h2>
      </div>
      <div className="flex flex-col gap-3 text-[15px] text-[#A0A0A0] leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 list-none">
      <span
        className="mt-[6px] h-[6px] w-[6px] shrink-0 rounded-full bg-[#D4A053]"
        aria-hidden="true"
      />
      <span>{children}</span>
    </li>
  );
}
