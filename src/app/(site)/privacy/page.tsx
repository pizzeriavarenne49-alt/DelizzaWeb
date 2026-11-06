import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_ENTITY, SITE_URL } from "@/lib/seo";
import { META_CONSENT_REVISION } from "@/marketing/types";

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
  const metaAdvertisingAvailable = process.env.NEXT_PUBLIC_META_ADVERTISING_ENABLED === "true";

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
          Dernière mise à jour : {metaAdvertisingAvailable ? "6 novembre 2026" : "5 novembre 2026"}
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
            <strong className="text-[#F5F5F5]">Données de navigation optionnelles</strong> —
            pages consultées, étapes de panier et de commande, identifiant de session pseudonyme
            et, si vous l&apos;acceptez séparément, paramètres de campagne et domaine référent.
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
          <Item>Des <strong className="text-[#F5F5F5]">mesures d&apos;audience et marketing optionnelles</strong> après votre choix, afin de comprendre les visites et les campagnes.</Item>
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
            <strong className="text-[#F5F5F5]">Consentement</strong> — mesure d&apos;audience,
            traceurs analytiques éventuels et mesure marketing (art. 6.1.a RGPD).
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
          <ProviderCard name="Google Analytics" role="Statistiques de fréquentation, uniquement si cette finalité est acceptée et si le service est configuré" />
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
            <strong className="text-[#F5F5F5]">Choix de confidentialité</strong> — jusqu&apos;à 6 mois
            sur votre appareil. Les sessions et événements internes sont conservés pour une durée
            limitée définie par l&apos;établissement ; les données nécessaires aux commandes suivent
            leur propre durée légale.
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
        <p>Nous distinguons les traceurs techniques indispensables des finalités optionnelles :</p>
        <ul className="flex flex-col gap-2 pl-1">
          <Item>
            <strong className="text-[#F5F5F5]">Cookies techniques indispensables</strong> —
            nécessaires au fonctionnement du site (session, panier). Ils ne requièrent pas de
            consentement.
          </Item>
          <Item>
            <strong className="text-[#F5F5F5]">Mesure d&apos;audience</strong> — pages et étapes de
            navigation, avec un identifiant pseudonyme. Google Analytics, lorsqu&apos;il est configuré,
            ne se charge qu&apos;après acceptation de cette finalité.
          </Item>
          <Item>
            <strong className="text-[#F5F5F5]">Mesure marketing interne</strong> — paramètres UTM,
            liens de campagne et domaine référent, uniquement avec votre accord. Elle aide à
            rapprocher certaines commandes des campagnes dans nos outils internes.
          </Item>
          {metaAdvertisingAvailable && (
            <Item>
              <strong className="text-[#F5F5F5]">Mesure publicitaire Meta</strong> — choix distinct
              de la mesure d&apos;audience et de la mesure marketing interne.
            </Item>
          )}
        </ul>
        <p>
          Vous pouvez tout refuser depuis le bandeau. Vous pouvez modifier ou retirer votre accord
          à tout moment avec <strong className="text-[#F5F5F5]">« Gérer mes choix »</strong> en bas
          de page. Vos choix facultatifs sont sans effet sur l&apos;accès au site et la commande.
        </p>
      </Section>

      {metaAdvertisingAvailable && (
        <Section emoji="📊" title="Mesure des publicités Facebook et Instagram">
          <p>
            Lorsqu&apos;elle est proposée, cette mesure repose sur votre consentement. Elle permet
            à DELIZZA d&apos;évaluer ses publicités et de rapprocher un clic publicitaire d&apos;une
            visite ou d&apos;un achat confirmé. Vous pouvez l&apos;accepter séparément.
          </p>
          <p>
            Après votre accord, le Pixel Meta peut transmettre à Meta des événements de consultation,
            d&apos;ajout au panier, de début de commande et d&apos;achat confirmé. Selon
            l&apos;événement, Meta peut recevoir la date et l&apos;heure, l&apos;adresse de la
            page ou sa provenance, des références et quantités de produits, le montant et la
            devise, des identifiants pseudonymes de navigateur ou de clic (_fbp, _fbc, fbclid),
            ainsi que des informations techniques de connexion comme l&apos;adresse IP et le navigateur.
          </p>
          <p>
            Notre serveur peut transmettre un achat via l&apos;API Conversions après confirmation
            du paiement et contrôle de votre consentement. Il transmet la date et l&apos;heure,
            le montant et la devise, une adresse de confirmation sans paramètres, un identifiant
            de navigateur ou de clic et le type de navigateur. Lorsque les deux canaux transmettent
            le même achat, ils utilisent un identifiant aléatoire commun conçu pour que Meta
            puisse rapprocher les deux signaux.
          </p>
          <p>
            Notre application exclut le nom, l&apos;e-mail, le téléphone, l&apos;adresse de
            livraison, les identifiants de commande et de paiement et les coordonnées bancaires.
            Meta Platforms Ireland Limited reçoit les signaux publicitaires. Pour les opérations
            de collecte et de transmission relevant d&apos;une responsabilité conjointe, DELIZZA
            vous informe de la mesure et Meta traite les demandes portant sur les données
            qu&apos;elle conserve, selon son <a className="underline" href="https://www.facebook.com/legal/controller_addendum" rel="noreferrer">avenant relatif aux responsables du traitement</a>.
          </p>
          <p>
            Meta peut transférer des données hors de l&apos;Espace économique européen. Selon la
            destination et le service couvert, Meta indique notamment s&apos;appuyer sur des
            décisions d&apos;adéquation ou des clauses contractuelles types. Vous pouvez nous
            demander les garanties applicables et la façon d&apos;en obtenir une copie. Les critères
            de conservation et les modalités d&apos;exercice des droits auprès de Meta sont décrits
            dans sa <a href="https://www.facebook.com/privacy/policy/?locale=fr_FR" className="underline" rel="noreferrer">politique de confidentialité</a>.
          </p>
          <p>
            DelizzaWeb mémorise votre choix pendant 183 jours et utilise sa copie locale de
            l&apos;identifiant de clic pendant 90 jours au maximum. Le marqueur de confirmation
            d&apos;achat est utilisable pendant une heure. Les cookies du Pixel _fbp et _fbc,
            lorsqu&apos;ils sont déposés, expirent après 90 jours à compter de leur dépôt ou de
            leur renouvellement. Les sessions de mesure arrivent à échéance après 30 jours,
            les liens d&apos;attribution après 90 jours et la preuve technique d&apos;envoi
            d&apos;un achat après 14 jours. Leur suppression intervient ensuite selon le
            fonctionnement de la base de données. La conservation chez Meta est distincte.
          </p>
          <p>
            Le refus bloque le Pixel et les envois publicitaires. Le retrait arrête les nouveaux
            envois du navigateur et efface les identifiants publicitaires que DelizzaWeb maîtrise
            sur votre appareil. Le retrait bloque aussi les nouveaux envois liés à la session
            dès réception par notre serveur. Si vous êtes hors ligne, le site peut conserver
            jusqu&apos;à sept jours un justificatif technique pour réessayer. Pour vos droits et
            les données déjà transmises, écrivez à <a className="underline" href={`mailto:${legal.email}`}>{legal.email}</a>.
            Vous pouvez également <a className="underline" href="https://www.cnil.fr/fr/adresser-une-plainte">adresser une réclamation à la CNIL</a>.
          </p>
          <p className="text-[13px]">Version du consentement {META_CONSENT_REVISION}</p>
        </Section>
      )}

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
