import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS, SITE_URL } from "@/lib/seo";

/* ------------------------------------------------------------------ */
/*  Metadata                                                           */
/* ------------------------------------------------------------------ */

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation — Pizza Deli'Zza",
  description:
    "Conditions Générales d'Utilisation de Pizza Deli'Zza. Règles régissant l'utilisation du site delizza.fr et de l'application mobile pour la commande en ligne de pizzas artisanales.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/cgu" },
  openGraph: {
    title: "Conditions Générales d'Utilisation — Pizza Deli'Zza",
    description:
      "Conditions Générales d'Utilisation de Pizza Deli'Zza. Commande en ligne, paiement, retrait et vos droits.",
    url: `${SITE_URL}/cgu`,
  },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CguPage() {
  const { address } = BUSINESS;

  return (
    <article className="flex flex-col gap-8 px-4 pt-6 pb-10">
      {/* ── H1 ── */}
      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-medium text-[#D4A053] uppercase tracking-widest">
          Légal
        </p>
        <h1 className="text-[26px] font-bold text-[#F5F5F5] leading-tight">
          Conditions Générales d&apos;Utilisation
        </h1>
        <p className="text-[14px] text-[#6B6B6B]">
          Dernière mise à jour : 18 mars 2026
        </p>
      </div>

      <Section emoji="📄" title="Objet">
        <p>
          Les présentes Conditions Générales d&apos;Utilisation (CGU) régissent l&apos;utilisation
          du site <span className="text-[#F5F5F5]">delizza.fr</span> et de l&apos;application
          mobile <span className="text-[#F5F5F5]">Pizza Deli&apos;Zza</span> pour la commande en
          ligne de pizzas artisanales à emporter (click &amp; collect).
        </p>
        <p>
          Les informations relatives à l&apos;éditeur du site et à son hébergement sont disponibles
          sur la page{" "}
          <Link
            href="/mentions-legales"
            className="text-[#D4A053] underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            mentions légales
          </Link>
          .
        </p>
      </Section>

      {/* ── 2. Acceptation des CGU ── */}
      <Section emoji="✅" title="Acceptation des CGU">
        <p>
          L&apos;utilisation du service implique l&apos;acceptation sans réserve des présentes CGU.
          Elles sont accessibles à tout moment sur le site et l&apos;application.
        </p>
      </Section>

      {/* ── 3. Description du service ── */}
      <Section emoji="🍕" title="Description du service">
        <p>
          <span className="text-[#F5F5F5]">Pizza Deli&apos;Zza</span> propose un service de
          commande en ligne de pizzas artisanales à emporter. Le client passe commande via le site
          ou l&apos;application, effectue le paiement en ligne par carte bancaire (via{" "}
          <strong className="text-[#F5F5F5]">Stripe</strong>), puis retire sa commande
          au restaurant au créneau choisi :
        </p>
        <div className="rounded-[16px] bg-[#0D0D0D] border border-[#252525] p-4 flex flex-col gap-1 text-[14px]">
          <p className="font-semibold text-[#F5F5F5]">{BUSINESS.legalName}</p>
          <p>{address.streetAddress}</p>
          <p>
            {address.postalCode} {address.addressLocality}
          </p>
        </div>
      </Section>

      {/* ── 4. Création de compte ── */}
      <Section emoji="👤" title="Création de compte">
        <p>
          L&apos;accès au service de commande nécessite la création d&apos;un compte client.
        </p>
        <ul className="flex flex-col gap-2 pl-1">
          <Item>
            L&apos;utilisateur s&apos;engage à fournir des{" "}
            <strong className="text-[#F5F5F5]">informations exactes</strong> lors de
            l&apos;inscription et à les maintenir à jour.
          </Item>
          <Item>
            Il est responsable de la{" "}
            <strong className="text-[#F5F5F5]">confidentialité de ses identifiants</strong> de
            connexion.
          </Item>
          <Item>
            Il peut <strong className="text-[#F5F5F5]">supprimer son compte</strong> à tout moment
            depuis l&apos;application.
          </Item>
        </ul>
      </Section>

      {/* ── 5. Commandes et paiement ── */}
      <Section emoji="💳" title="Commandes et paiement">
        <ul className="flex flex-col gap-2 pl-1">
          <Item>
            Les prix sont indiqués en <strong className="text-[#F5F5F5]">euros TTC</strong>.
          </Item>
          <Item>
            La commande est <strong className="text-[#F5F5F5]">confirmée</strong> après validation
            du paiement.
          </Item>
          <Item>
            Les paiements en ligne par carte bancaire sont traités de manière sécurisée par{" "}
            <strong className="text-[#F5F5F5]">Stripe</strong> (certifié{" "}
            <strong className="text-[#F5F5F5]">PCI DSS</strong>).
          </Item>
          <Item>
            Les commandes passées sur le site sont payées en ligne uniquement.
            Aucun paiement sur place n&apos;est proposé pour les commandes web.
          </Item>
        </ul>
      </Section>

      {/* ── 6. Retrait des commandes ── */}
      <Section emoji="🏪" title="Retrait des commandes">
        <p>
          Les commandes sont à retirer au point de retrait dans le{" "}
          <strong className="text-[#F5F5F5]">créneau horaire indiqué</strong> lors de la commande.
        </p>
        <p>
          Passé un délai raisonnable de{" "}
          <strong className="text-[#F5F5F5]">30 minutes</strong> après le créneau prévu, la
          commande non retirée pourra être considérée comme abandonnée.
        </p>
      </Section>

      {/* ── 7. Droit de rétractation ── */}
      <Section emoji="↩️" title="Droit de rétractation">
        <p>
          Conformément à l&apos;article{" "}
          <strong className="text-[#F5F5F5]">L221-28 du Code de la consommation</strong>, le droit
          de rétractation ne s&apos;applique pas aux biens susceptibles de se détériorer rapidement
          (denrées alimentaires).
        </p>
        <p>
          Aucun remboursement ne sera accordé après la préparation de la commande, sauf en cas
          d&apos;<strong className="text-[#F5F5F5]">erreur avérée de notre part</strong>.
        </p>
      </Section>

      {/* ── 8. Responsabilité ── */}
      <Section emoji="⚖️" title="Responsabilité">
        <p>
          <span className="text-[#F5F5F5]">Pizza Deli&apos;Zza</span> s&apos;engage à préparer les
          commandes avec soin. En cas d&apos;erreur de commande ou de problème de qualité, le client
          peut contacter le service client pour obtenir un remboursement ou un avoir.
        </p>
        <p>
          Pizza Deli&apos;Zza ne saurait être tenue responsable en cas de :
        </p>
        <ul className="flex flex-col gap-2 pl-1">
          <Item>
            <strong className="text-[#F5F5F5]">Force majeure</strong>.
          </Item>
          <Item>
            <strong className="text-[#F5F5F5]">Indisponibilité temporaire</strong> du service.
          </Item>
          <Item>
            <strong className="text-[#F5F5F5]">Retard</strong> dû à des circonstances
            exceptionnelles.
          </Item>
        </ul>
      </Section>

      {/* ── 9. Propriété intellectuelle ── */}
      <Section emoji="©️" title="Propriété intellectuelle">
        <p>
          L&apos;ensemble des contenus du site et de l&apos;application (textes, images, logos,
          design) sont la propriété de{" "}
          <span className="text-[#F5F5F5]">Pizza Deli&apos;Zza</span> et sont protégés par le
          droit de la propriété intellectuelle.
        </p>
        <p>
          Toute reproduction, représentation ou diffusion sans autorisation préalable écrite est{" "}
          <strong className="text-[#F5F5F5]">interdite</strong>.
        </p>
      </Section>

      {/* ── 10. Protection des données ── */}
      <Section emoji="🔐" title="Protection des données">
        <p>
          Les données personnelles sont traitées conformément à notre{" "}
          <Link
            href="/privacy"
            className="text-[#D4A053] underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            politique de confidentialité
          </Link>
          . Pour plus d&apos;informations, consultez notre page dédiée.
        </p>
      </Section>

      {/* ── 11. Modification des CGU ── */}
      <Section emoji="📝" title="Modification des CGU">
        <p>
          <span className="text-[#F5F5F5]">Pizza Deli&apos;Zza</span> se réserve le droit de
          modifier les présentes CGU à tout moment. Les modifications entrent en vigueur dès leur
          publication sur le site.
        </p>
        <p>
          La date de dernière mise à jour est indiquée en haut de la page.
        </p>
      </Section>

      {/* ── 12. Droit applicable et litiges ── */}
      <Section emoji="🏛️" title="Droit applicable et litiges">
        <p>
          Les présentes CGU sont régies par le{" "}
          <strong className="text-[#F5F5F5]">droit français</strong>. En cas de litige, une
          solution amiable sera recherchée avant toute action judiciaire.
        </p>
        <p>
          À défaut, les <strong className="text-[#F5F5F5]">tribunaux compétents d&apos;Angers</strong>{" "}
          seront seuls compétents.
        </p>
      </Section>

      {/* ── 13. Contact ── */}
      <section className="flex flex-col gap-4 rounded-[24px] bg-gradient-to-br from-[#1A1A1A] to-[#252525] p-6">
        <div className="flex items-center gap-2">
          <span className="text-[20px]" aria-hidden="true">✉️</span>
          <h2 className="text-[20px] font-semibold text-[#F5F5F5]">Contact</h2>
        </div>
        <p className="text-[15px] text-[#A0A0A0]">
          Pour toute question relative aux présentes CGU :
        </p>
        <div className="flex flex-col gap-1 text-[14px] text-[#A0A0A0]">
          <p className="font-semibold text-[#F5F5F5]">{BUSINESS.name}</p>
          <p className="text-[#D4A053]">{BUSINESS.email}</p>
          <Link
            href="/mentions-legales"
            className="text-[#D4A053] underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            Mentions légales
          </Link>
        </div>
      </section>

      {/* ── Back link ── */}
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
