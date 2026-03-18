import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { communeBySlug, allCommuneSlugs, nearbyCommunes, BUSINESS, SITE_URL, OG_IMAGE } from "@/lib/seo";
import { breadcrumbSchema, faqSchema, communeFaqs } from "@/lib/schemas";
import JsonLd from "@/components/seo/JsonLd";

/* ------------------------------------------------------------------ */
/*  Static generation                                                  */
/* ------------------------------------------------------------------ */

export function generateStaticParams() {
  return allCommuneSlugs().map((slug) => ({ slug }));
}

/* ------------------------------------------------------------------ */
/*  Metadata                                                           */
/* ------------------------------------------------------------------ */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const commune = communeBySlug(slug);
  if (!commune) return {};

  const isVariante = slug.startsWith("pizzeria-");
  const prefix = isVariante ? "Pizzeria à emporter" : "Pizza à emporter";

  return {
    title: `${prefix} à ${commune.name} — Pizza Deli'Zza`,
    description: `${prefix} à ${commune.name} (${commune.driveTime} d'Orée d'Anjou). Pâte longue fermentation, ingrédients frais et locaux. Commandez en click & collect chez Pizza Deli'Zza.`,
    alternates: { canonical: `/${slug}` },
    openGraph: {
      title: `${prefix} à ${commune.name} — Pizza Deli'Zza`,
      description: `Commandez vos pizzas artisanales en click & collect depuis ${commune.name}. Retrait à La Varenne en ${commune.driveTime}.`,
      url: `${SITE_URL}/${slug}`,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: `Pizza Deli'Zza — ${prefix} à ${commune.name}` }],
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function CommunePage({ params }: PageProps) {
  const { slug } = await params;
  const commune = communeBySlug(slug);
  if (!commune) notFound();

  const isVariante = slug.startsWith("pizzeria-");
  const h1Prefix = isVariante ? "Pizzeria à emporter" : "Pizza à emporter";

  const faqs = communeFaqs(commune);
  const nearby = nearbyCommunes(slug);

  const breadcrumbs = [
    { name: "Accueil", href: "/" },
    { name: `${h1Prefix} à ${commune.name}`, href: `/${slug}` },
  ];

  return (
    <>
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={faqSchema(faqs)} />

      <article className="flex flex-col gap-8 px-4 pt-6 pb-10">
        {/* H1 */}
        <h1 className="text-[26px] font-bold text-[#F5F5F5] leading-tight">
          {h1Prefix} à {commune.name} — Pizza Deli&apos;Zza
        </h1>

        {/* Intro */}
        <section className="flex flex-col gap-4 text-[15px] text-[#A0A0A0] leading-relaxed">
          <p>{commune.intro}</p>
          <p>
            Chez Pizza Deli&apos;Zza, chaque pizza est préparée à la commande avec une pâte à longue
            fermentation (48 heures minimum), de la mozzarella de qualité et des ingrédients
            soigneusement sélectionnés. Notre savoir-faire artisanal se goûte dès la première
            bouchée : une pâte aérienne, croustillante à l&apos;extérieur, moelleuse à
            l&apos;intérieur.
          </p>
        </section>

        {/* Click & Collect */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[20px] font-semibold text-[#F5F5F5]">
            Commander en click &amp; collect depuis {commune.name}
          </h2>
          <div className="text-[15px] text-[#A0A0A0] leading-relaxed flex flex-col gap-3">
            <p>
              Pas envie d&apos;attendre sur place ? Commandez directement en ligne sur{" "}
              <Link href="/menu" className="text-[#D4A053] underline">
                notre menu
              </Link>{" "}
              et récupérez votre commande à La Varenne, prête à l&apos;heure que vous choisissez.
              C&apos;est simple, rapide et sans surprise.
            </p>
            <p>
              Vous pouvez également commander par téléphone au{" "}
              <span className="text-[#D4A053]">{BUSINESS.telephone}</span> pendant nos heures
              d&apos;ouverture.
            </p>
          </div>
        </section>

        {/* Accès */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[20px] font-semibold text-[#F5F5F5]">
            Comment venir depuis {commune.name}
          </h2>
          <div className="text-[15px] text-[#A0A0A0] leading-relaxed flex flex-col gap-3">
            <p>{commune.access}</p>
            <p>{commune.landmarks}</p>
          </div>
        </section>

        {/* Horaires */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[20px] font-semibold text-[#F5F5F5]">Nos horaires</h2>
          <p className="text-[15px] text-[#A0A0A0]">
            {BUSINESS.openingHoursText}. Fermé le lundi.
          </p>
          <p className="text-[15px] text-[#A0A0A0]">
            Nous vous conseillons de commander en avance pour les créneaux du soir (18h–22h), très
            demandés le week-end.
          </p>
        </section>

        {/* Qualité */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[20px] font-semibold text-[#F5F5F5]">
            Notre engagement qualité
          </h2>
          <div className="text-[15px] text-[#A0A0A0] leading-relaxed flex flex-col gap-3">
            <p>
              Tout est fait maison chez Pizza Deli&apos;Zza. Notre pâte repose pendant au moins 48 heures
              pour développer des arômes complexes et une texture incomparable. Nous travaillons avec
              des producteurs locaux pour nos légumes, notre charcuterie et nos fromages.
            </p>
            <p>
              Pas de pizza industrielle, pas de surgelé, pas de raccourci. Juste du bon, du frais,
              du local. C&apos;est notre promesse pour chaque pizza qui sort de notre four.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="flex flex-col gap-4">
          <h2 className="text-[20px] font-semibold text-[#F5F5F5]">
            Questions fréquentes
          </h2>
          <dl className="flex flex-col gap-4">
            {faqs.map((faq, i) => (
              <div key={i} className="flex flex-col gap-1">
                <dt className="text-[15px] font-medium text-[#F5F5F5]">{faq.question}</dt>
                <dd className="text-[14px] text-[#A0A0A0] leading-relaxed">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Communes voisines */}
        {nearby.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-[15px] font-medium text-[#6B6B6B]">
              Pizza à emporter près de chez vous
            </h2>
            <div className="flex flex-wrap gap-2">
              {nearby.map((c) => (
                <Link
                  key={c.slug}
                  href={`/${c.slug}`}
                  className="rounded-full bg-[#0D0D0D] border border-[#252525] px-3 py-1.5 text-[13px] text-[#A0A0A0] hover:text-[#D4A053] hover:border-[#D4A053] transition-colors"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTAs */}
        <section className="flex flex-col items-center gap-3 rounded-[24px] bg-gradient-to-br from-[#1A1A1A] to-[#252525] p-6 text-center">
          <p className="text-[15px] text-[#A0A0A0]">
            Envie d&apos;une pizza artisanale ce soir ?
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/menu"
              className="inline-flex items-center justify-center rounded-[18px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] px-6 py-2.5 text-[15px] font-semibold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)] active:scale-95 transition-transform"
            >
              Commander
            </Link>
            <Link
              href="/offers"
              className="inline-flex items-center justify-center rounded-[18px] border border-[#D4A053] px-6 py-2.5 text-[15px] font-semibold text-[#D4A053] active:scale-95 transition-transform"
            >
              Voir les offres
            </Link>
          </div>
        </section>
      </article>
    </>
  );
}
