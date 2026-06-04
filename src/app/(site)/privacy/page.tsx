import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_ENTITY, SITE_URL } from "@/lib/seo";

/* ------------------------------------------------------------------ */
/*  Metadata                                                           */
/* ------------------------------------------------------------------ */

export const metadata: Metadata = {
  title: "Politique de confidentialité — Pizza Deli'Zza",
  description:
    "Politique de confidentialité de Pizza Deli'Zza. Découvrez comment nous collectons, utilisons et protégeons vos données personnelles conformément au RGPD.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Politique de confidentialité — Pizza Deli'Zza",
    description:
      "Politique de confidentialité de Pizza Deli'Zza. Vos données personnelles, leur utilisation et vos droits RGPD.",
    url: `${SITE_URL}/privacy`,
  },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PrivacyPage() {
  const legal = LEGAL_ENTITY;

  return (
    <article className="flex flex-col gap-8 px-4 pt-6 pb-10">
      {/* ── H1 ── */}
      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-medium text-[#D4A053] uppercase tracking-widest">
          Légal
        </p>
        <h1 className="text-[26px] font-bold text-[#F5F5F5] leading-tight">
          Politique de confidentialité
        </h1>
        <p className="text-[14px] text-[#6B6B6B]">
          Dernière mise à jour : 6 mars 2026
        </p>
      </div>

      {/* ── 1. Responsable du traitement ── */}
      <Section emoji="🏢" title="Responsable du traitement">
        <p>
          Le responsable du traitement des données personnelles collectées via le site{" "}
          <span className="text-[#F5F5F5]">delizza.fr</span> et l&apos;application mobile{" "}
          <span className="text-[#F5F5F5]">Pizza Deli&apos;Zza</span> est :
        </p>
        <div className="rounded-[16px] bg-[#0D0D0D] border border-[#252525] p-4 flex flex-col gap-1 text-[14px]">
          <p className="font-semibold text-[#F5F5F5]">{legal.denomination}</p>
          <p>{legal.legalForm}</p>
          <p>SIRET : {legal.siret}</p>
          <p>{legal.registeredOffice.streetAddress}</p>
          <p>
            {legal.registeredOffice.postalCode} {legal.registeredOffice.addressLocality}
          </p>
          <p>{legal.registeredOffice.addressCountry}</p>
          <p>
            Email :{" "}
            <span className="text-[#D4A053]">{legal.email}</span>
          </p>
        </div>
      </Section>

      {/* ── 2. Données collectées ── */}
      <Section emoji="📋" title="Données collectées">
        <p>Nous collectons les catégories de données suivantes :</p>
        <ul className="flex flex-col gap-2 pl-1">
          <Item>
            <strong className="text-[#F5F5F5]">Données d&apos;identification</strong> — nom,
            prénom, adresse e-mail, lors de la création de votre compte.
          </Item>
          <Item>
            <strong className="text-[#F5F5F5]">Données de commande</strong> — détail des articles
            commandés, montant, date et heure de retrait.
          </Item>
          <Item>
            <strong className="text-[#F5F5F5]">Données de paiement</strong> — vos coordonnées
            bancaires sont gérées directement par <strong className="text-[#F5F5F5]">Stripe</strong>{" "}
            et ne transitent jamais par nos serveurs.
          </Item>
          <Item>
            <strong className="text-[#F5F5F5]">Données de navigation</strong> — pages visitées,
            durée de session, type d&apos;appareil, via Google Analytics (anonymisées).
          </Item>
        </ul>
      </Section>

      {/* ── 3. Finalités du traitement ── */}
      <Section emoji="🎯" title="Finalités du traitement">
        <p>Vos données sont utilisées pour :</p>
        <ul className="flex flex-col gap-2 pl-1">
          <Item>La <strong className="text-[#F5F5F5]">gestion de vos commandes</strong> (préparation, confirmation, retrait).</Item>
          <Item>La <strong className="text-[#F5F5F5]">gestion de votre compte</strong> client et de votre historique.</Item>
          <Item>L&apos;<strong className="text-[#F5F5F5]">amélioration de nos services</strong> et de l&apos;expérience utilisateur.</Item>
          <Item>Des <strong className="text-[#F5F5F5]">analyses statistiques anonymisées</strong> sur la fréquentation du site et de l&apos;application.</Item>
        </ul>
      </Section>

      {/* ── 4. Base légale ── */}
      <Section emoji="⚖️" title="Base légale du traitement">
        <ul className="flex flex-col gap-2 pl-1">
          <Item>
            <strong className="text-[#F5F5F5]">Exécution du contrat</strong> — traitement des
            commandes et gestion du compte (art. 6.1.b RGPD).
          </Item>
          <Item>
            <strong className="text-[#F5F5F5]">Consentement</strong> — dépôt de cookies
            analytiques (Google Analytics) (art. 6.1.a RGPD).
          </Item>
          <Item>
            <strong className="text-[#F5F5F5]">Intérêt légitime</strong> — amélioration de nos
            services et prévention des fraudes (art. 6.1.f RGPD).
          </Item>
        </ul>
      </Section>

      {/* ── 5. Partage des données ── */}
      <Section emoji="🤝" title="Partage des données">
        <p>
          Nous ne vendons pas vos données personnelles à des tiers. Vos données peuvent être
          transmises aux prestataires techniques suivants, dans le strict cadre de leurs missions :
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ProviderCard name="Google Firebase" role="Hébergement des données (Union Européenne)" />
          <ProviderCard name="Stripe" role="Paiements sécurisés" />
          <ProviderCard name="Google Analytics" role="Statistiques de fréquentation (données anonymisées)" />
          <ProviderCard name="Vercel" role="Hébergement du site web" />
        </div>
        <p>
          Chaque prestataire est lié par un accord de traitement des données conforme au RGPD.
        </p>
      </Section>

      {/* ── 6. Durée de conservation ── */}
      <Section emoji="🗓️" title="Durée de conservation">
        <ul className="flex flex-col gap-2 pl-1">
          <Item>
            <strong className="text-[#F5F5F5]">Données de compte</strong> — conservées jusqu&apos;à
            la suppression de votre compte, puis 3 ans à des fins de preuve.
          </Item>
          <Item>
            <strong className="text-[#F5F5F5]">Données de commande</strong> — 5 ans (obligation
            comptable et fiscale).
          </Item>
          <Item>
            <strong className="text-[#F5F5F5]">Données analytics</strong> — 14 mois (configuration
            par défaut de Google Analytics).
          </Item>
        </ul>
      </Section>

      {/* ── 7. Vos droits RGPD ── */}
      <Section emoji="🔐" title="Vos droits (RGPD)">
        <p>
          Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi
          Informatique et Libertés, vous disposez des droits suivants :
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            { icon: "👁️", label: "Accès" },
            { icon: "✏️", label: "Rectification" },
            { icon: "🗑️", label: "Suppression" },
            { icon: "📦", label: "Portabilité" },
            { icon: "🚫", label: "Opposition" },
            { icon: "⏸️", label: "Limitation" },
          ].map(({ icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-[12px] bg-[#0D0D0D] border border-[#252525] px-3 py-2 text-[14px]"
            >
              <span aria-hidden="true">{icon}</span>
              <span className="text-[#F5F5F5]">{label}</span>
            </div>
          ))}
        </div>
        <p>
          Pour exercer ces droits, contactez-nous par email :{" "}
          <span className="text-[#D4A053]">{legal.email}</span>.
        </p>
        <p>
          En cas de réponse insatisfaisante, vous pouvez introduire une réclamation auprès de la{" "}
          <strong className="text-[#F5F5F5]">
            CNIL (Commission Nationale de l&apos;Informatique et des Libertés)
          </strong>{" "}
          — <span className="text-[#D4A053]">www.cnil.fr</span>.
        </p>
      </Section>

      {/* ── 8. Cookies et traceurs ── */}
      <Section emoji="🍪" title="Cookies et traceurs">
        <p>Nous utilisons deux catégories de cookies :</p>
        <ul className="flex flex-col gap-2 pl-1">
          <Item>
            <strong className="text-[#F5F5F5]">Cookies techniques indispensables</strong> —
            nécessaires au fonctionnement du site (session, panier). Ils ne requièrent pas de
            consentement.
          </Item>
          <Item>
            <strong className="text-[#F5F5F5]">Google Analytics</strong> — mesure d&apos;audience
            avec anonymisation de l&apos;adresse IP activée. Ces cookies sont déposés avec votre
            consentement.
          </Item>
        </ul>
        <p>
          Vous pouvez à tout moment refuser ou retirer votre consentement aux cookies analytiques
          via les paramètres de votre navigateur.
        </p>
      </Section>

      {/* ── 9. Sécurité ── */}
      <Section emoji="🛡️" title="Sécurité des données">
        <p>
          Nous mettons en œuvre des mesures techniques et organisationnelles adaptées pour protéger
          vos données personnelles :
        </p>
        <ul className="flex flex-col gap-2 pl-1">
          <Item>Chiffrement des communications via le protocole <strong className="text-[#F5F5F5]">HTTPS/TLS</strong>.</Item>
          <Item>Hébergement sur <strong className="text-[#F5F5F5]">Google Firebase</strong> (infrastructure sécurisée, UE) et <strong className="text-[#F5F5F5]">Vercel</strong>.</Item>
          <Item>Paiements traités exclusivement par <strong className="text-[#F5F5F5]">Stripe</strong>, certifié PCI DSS.</Item>
          <Item>Accès aux données limité aux seules personnes habilitées.</Item>
        </ul>
      </Section>

      {/* ── 10. Modifications ── */}
      <Section emoji="📝" title="Modifications de la politique">
        <p>
          Cette politique de confidentialité peut être mise à jour pour refléter l&apos;évolution de
          nos services ou des obligations légales. La date de dernière mise à jour est indiquée en
          haut de cette page.
        </p>
        <p>
          En cas de modification substantielle, nous vous en informerons via l&apos;application ou
          par email.
        </p>
      </Section>

      {/* ── 11. Contact ── */}
      <section className="flex flex-col gap-4 rounded-[24px] bg-gradient-to-br from-[#1A1A1A] to-[#252525] p-6">
        <div className="flex items-center gap-2">
          <span className="text-[20px]" aria-hidden="true">✉️</span>
          <h2 className="text-[20px] font-semibold text-[#F5F5F5]">Contact</h2>
        </div>
        <p className="text-[15px] text-[#A0A0A0]">
          Pour toute question relative à la présente politique ou à vos données personnelles :
        </p>
        <div className="flex flex-col gap-1 text-[14px] text-[#A0A0A0]">
          <p className="font-semibold text-[#F5F5F5]">{legal.denomination}</p>
          <p>{legal.registeredOffice.streetAddress}</p>
          <p>
            {legal.registeredOffice.postalCode} {legal.registeredOffice.addressLocality}
          </p>
          <p>{legal.registeredOffice.addressCountry}</p>
          <p className="text-[#D4A053]">{legal.email}</p>
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

function ProviderCard({ name, role }: { name: string; role: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[16px] bg-[#0D0D0D] border border-[#252525] p-3">
      <p className="text-[14px] font-semibold text-[#D4A053]">{name}</p>
      <p className="text-[13px] text-[#6B6B6B]">{role}</p>
    </div>
  );
}
