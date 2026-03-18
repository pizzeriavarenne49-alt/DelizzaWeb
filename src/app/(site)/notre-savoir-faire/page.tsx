import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, OG_IMAGE } from "@/lib/seo";
import { breadcrumbSchema } from "@/lib/schemas";
import JsonLd from "@/components/seo/JsonLd";

/* ------------------------------------------------------------------ */
/*  Metadata                                                           */
/* ------------------------------------------------------------------ */

export const metadata: Metadata = {
  title: "Notre savoir-faire — Pizza artisanale à longue fermentation | Deli'Zza",
  description:
    "Découvrez le savoir-faire de Pizza Deli'Zza : pâte à longue fermentation de 48h, ingrédients frais et locaux, cuisson au four. Pizzeria artisanale à La Varenne.",
  alternates: { canonical: "/notre-savoir-faire" },
  openGraph: {
    title: "Notre savoir-faire — Pizza artisanale à longue fermentation | Deli'Zza",
    description:
      "Pâte à longue fermentation 48h, ingrédients frais et locaux, cuisson maîtrisée. Découvrez comment Pizza Deli'Zza fabrique ses pizzas artisanales à La Varenne.",
    url: `${SITE_URL}/notre-savoir-faire`,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Pizza Deli'Zza — Savoir-faire artisanal" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Notre savoir-faire — Pizza artisanale à longue fermentation | Deli'Zza",
    description:
      "Pâte à longue fermentation 48h, ingrédients frais et locaux. Le savoir-faire artisanal de Pizza Deli'Zza.",
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
            Chez Pizza Deli&apos;Zza, rien n&apos;est laissé au hasard. Chaque pizza naît
            d&apos;un processus artisanal pensé pour vous offrir le meilleur résultat dans
            votre assiette.
          </p>
        </div>

        {/* ── 1. La pâte à longue fermentation ── */}
        <Section emoji="🌾" title="La pâte à longue fermentation">
          <p>
            Tout commence par la pâte. Notre recette repose sur une{" "}
            <strong className="text-[#F5F5F5]">longue fermentation de 48 heures minimum</strong>{" "}
            au froid. Ce processus lent transforme les sucres naturels de la farine et développe
            une complexité aromatique impossible à obtenir avec une pâte rapide.
          </p>
          <p>
            Concrètement, cela change tout : la pâte devient plus{" "}
            <strong className="text-[#F5F5F5]">légère et digeste</strong>, les arômes se
            développent naturellement, et la texture finale — croustillante à l&apos;extérieur,
            moelleuse et alvéolée à l&apos;intérieur — est incomparable. C&apos;est la signature
            de nos pizzas.
          </p>
          <p>
            La fermentation lente permet aussi de réduire le gluten actif, ce qui rend la pâte
            plus facile à digérer. Une bonne pizza ne doit pas peser sur l&apos;estomac.
          </p>
        </Section>

        {/* ── 2. Des ingrédients frais et locaux ── */}
        <Section emoji="🥗" title="Des ingrédients frais et locaux">
          <p>
            Une belle pâte ne suffit pas : ce sont aussi les ingrédients qui font la différence.
            Nous sélectionnons soigneusement chaque produit, en privilégiant les{" "}
            <strong className="text-[#F5F5F5]">producteurs locaux</strong> du Maine-et-Loire et
            de Loire-Atlantique dès que possible.
          </p>
          <ul className="flex flex-col gap-2 pl-1">
            <Item>
              <strong className="text-[#F5F5F5]">Mozzarella de qualité</strong> — fondante,
              crémeuse, sélectionnée pour son goût et sa texture à la cuisson.
            </Item>
            <Item>
              <strong className="text-[#F5F5F5]">Légumes frais</strong> — approvisionnés
              régulièrement, jamais de légumes en conserve sur nos pizzas.
            </Item>
            <Item>
              <strong className="text-[#F5F5F5]">Charcuterie sélectionnée</strong> — jambon,
              lardons, chorizo et autres garnitures choisies pour leur qualité gustative.
            </Item>
            <Item>
              <strong className="text-[#F5F5F5]">Sauce tomate maison</strong> — préparée avec
              des tomates de qualité, assaisonnée simplement pour laisser les garnitures
              s&apos;exprimer.
            </Item>
          </ul>
        </Section>

        {/* ── 3. La cuisson ── */}
        <Section emoji="🔥" title="La cuisson">
          <p>
            La cuisson est l&apos;étape finale qui révèle tout le travail en amont. Nos pizzas
            sont enfournées à{" "}
            <strong className="text-[#F5F5F5]">haute température</strong>, ce qui permet
            d&apos;obtenir une coloration homogène, des bords gonflés et bien dorés, et une
            base croustillante sans dessécher la garniture.
          </p>
          <p>
            Le résultat : une pizza qui sort du four à point, avec une pâte qui claque sous la
            dent, une mozzarella filante et des arômes de cuisson qui donnent envie dès
            l&apos;ouverture de la boîte. Ce contrôle de la cuisson est ce qui distingue une
            vraie pizza artisanale d&apos;une pizza industrielle réchauffée.
          </p>
        </Section>

        {/* ── 4. Le click & collect ── */}
        <Section emoji="📱" title="Le click &amp; collect">
          <p>
            Commander chez Pizza Deli&apos;Zza, c&apos;est simple et sans mauvaise surprise. Voici
            comment ça marche :
          </p>
          <ul className="flex flex-col gap-2 pl-1">
            <Item>
              Rendez-vous sur{" "}
              <Link href="/menu" className="text-[#D4A053] underline underline-offset-2 hover:opacity-80 transition-opacity">
                notre menu en ligne
              </Link>{" "}
              et composez votre commande.
            </Item>
            <Item>
              Choisissez votre créneau de retrait et procédez au paiement sécurisé.
            </Item>
            <Item>
              Votre pizza est préparée à la commande — elle n&apos;est pas faite à
              l&apos;avance et mise de côté.
            </Item>
            <Item>
              Venez chercher votre commande au{" "}
              <strong className="text-[#F5F5F5]">98 Place du Jardin Public à La Varenne</strong>{" "}
              à l&apos;heure prévue. Votre pizza est chaude et fraîche.
            </Item>
          </ul>
          <p>
            Pas de livraison, pas d&apos;intermédiaire. Le click &amp; collect nous permet de
            garantir une pizza à la bonne température et au meilleur état possible jusqu&apos;à
            votre table.
          </p>
        </Section>

        {/* ── 5. Notre engagement ── */}
        <Section emoji="🤝" title="Notre engagement">
          <p>
            Chez Pizza Deli&apos;Zza, nous avons fait des choix clairs dès le départ :
          </p>
          <ul className="flex flex-col gap-2 pl-1">
            <Item>
              <strong className="text-[#F5F5F5]">Pas d&apos;industriel.</strong> Toutes nos
              pâtes, sauces et garnitures sont préparées sur place, sans recourir à des
              bases industrielles.
            </Item>
            <Item>
              <strong className="text-[#F5F5F5]">Pas de surgelé.</strong> Nos ingrédients
              sont frais. Nous commandons selon les besoins pour garantir la fraîcheur.
            </Item>
            <Item>
              <strong className="text-[#F5F5F5]">Tout fait maison.</strong> De la pâte à la
              garniture, chaque pizza est le résultat d&apos;un travail artisanal quotidien.
            </Item>
            <Item>
              <strong className="text-[#F5F5F5]">Un menu assumé.</strong> Nous préférons une
              carte réduite avec des pizzas maîtrisées plutôt qu&apos;une liste interminable
              de produits de qualité douteuse.
            </Item>
          </ul>
          <p>
            Ce sont ces engagements qui nous permettent de vous proposer une pizza honnête,
            généreuse et vraiment bonne. C&apos;est tout ce qu&apos;on vous promet.
          </p>
        </Section>

        {/* ── CTA ── */}
        <section className="flex flex-col items-center gap-3 rounded-[24px] bg-gradient-to-br from-[#1A1A1A] to-[#252525] p-6 text-center">
          <p className="text-[15px] text-[#A0A0A0]">
            Convaincu ? Découvrez nos pizzas artisanales.
          </p>
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
      <span className="mt-[6px] h-[6px] w-[6px] shrink-0 rounded-full bg-[#D4A053]" aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}
