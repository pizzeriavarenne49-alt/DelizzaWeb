import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Pizza Deli'Zza",
  description: "Politique de confidentialité conforme RGPD de Pizza Deli'Zza.",
};

const privacyJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Politique de confidentialité — Pizza Deli'Zza",
  url: "https://www.delizza.fr/privacy",
  inLanguage: "fr-FR",
};

export default function PrivacyPage() {
  return (
    <div className="bg-[#0D0D0D] px-4 py-10 text-[#F5F5F5] md:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(privacyJsonLd) }}
      />

      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-yellow-500">Politique de confidentialité</h1>
          <p className="text-sm text-[#A0A0A0]">Dernière mise à jour : 21 avril 2026</p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-yellow-500">1. Responsable du traitement</h2>
          <p className="text-[#D0D0D0]">Pizza Deli&apos;Zza</p>
          <p className="text-[#D0D0D0]">Contact : contact@delizza.fr | +33 (0)X XX XX XX XX</p>
          <p className="text-[#D0D0D0]">
            L&apos;application mobile Pizza Deli&apos;Zza est développée et exploitée via la
            plateforme WLHORIZON.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-yellow-500">2. Données collectées</h2>
          <ul className="list-disc space-y-2 pl-5 text-[#D0D0D0]">
            <li>
              Données d&apos;identification : nom, prénom, adresse e-mail, numéro de téléphone
            </li>
            <li>
              Données de commande : articles commandés, historique, adresse de livraison
            </li>
            <li>
              Données de paiement : traitées directement par nos prestataires (Stripe, SumUp) —
              non stockées par Pizza Deli&apos;Zza
            </li>
            <li>
              Données techniques : identifiants appareil, logs et données de crash (via Firebase
              Crashlytics)
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-yellow-500">3. Finalités du traitement</h2>
          <ul className="list-disc space-y-2 pl-5 text-[#D0D0D0]">
            <li>Gestion des comptes utilisateurs</li>
            <li>Traitement et suivi des commandes</li>
            <li>Amélioration de l&apos;application (analytics, stabilité)</li>
            <li>Communication marketing (avec consentement)</li>
            <li>Obligations légales (facturation, comptabilité)</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-yellow-500">4. Base légale</h2>
          <ul className="list-disc space-y-2 pl-5 text-[#D0D0D0]">
            <li>Exécution du contrat (commandes)</li>
            <li>Consentement (marketing, cookies)</li>
            <li>Obligation légale (comptabilité)</li>
            <li>Intérêt légitime (sécurité, amélioration du service)</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-yellow-500">5. Partage des données</h2>
          <p className="text-[#D0D0D0]">
            Vos données peuvent être transmises aux prestataires suivants :
          </p>
          <ul className="list-disc space-y-2 pl-5 text-[#D0D0D0]">
            <li>Stripe — Paiements en ligne (carte bancaire)</li>
            <li>SumUp — Paiements en point de vente (terminal de paiement)</li>
            <li>
              Google Firebase
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Authentification (Firebase Auth)</li>
                <li>Base de données (Firestore)</li>
                <li>Hébergement</li>
                <li>Analyse des crashs (Crashlytics)</li>
              </ul>
            </li>
            <li>Vercel — Hébergement du site web</li>
          </ul>
          <p className="text-[#D0D0D0]">
            Ces prestataires agissent en tant que sous-traitants et sont soumis à des garanties
            contractuelles.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-yellow-500">6. Transferts hors UE</h2>
          <p className="text-[#D0D0D0]">
            Certains prestataires (Google, Stripe) peuvent traiter des données hors de l&apos;Union
            européenne. Ces transferts sont encadrés par des garanties appropriées (Clauses
            Contractuelles Types, Data Privacy Framework).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-yellow-500">7. Durée de conservation</h2>
          <ul className="list-disc space-y-2 pl-5 text-[#D0D0D0]">
            <li>Données de compte : jusqu&apos;à suppression du compte + 3 ans</li>
            <li>Données de commande : 10 ans (obligations comptables)</li>
            <li>Données techniques : 12 mois maximum</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-yellow-500">8. Vos droits (RGPD)</h2>
          <p className="text-[#D0D0D0]">Vous disposez des droits suivants :</p>
          <ul className="list-disc space-y-2 pl-5 text-[#D0D0D0]">
            <li>Droit d&apos;accès, de rectification, d&apos;effacement</li>
            <li>Droit à la limitation du traitement</li>
            <li>Droit à la portabilité</li>
            <li>Droit d&apos;opposition</li>
          </ul>
          <p className="text-[#D0D0D0]">Pour exercer vos droits : contact@delizza.fr</p>
          <p className="text-[#D0D0D0]">
            Vous pouvez également introduire une réclamation auprès de la CNIL (www.cnil.fr).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-yellow-500">9. Suppression de compte</h2>
          <p className="text-[#D0D0D0]">
            Vous pouvez supprimer votre compte directement depuis l&apos;application ou via la page
            dédiée : https://www.delizza.fr/delete-account
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-yellow-500">10. Cookies</h2>
          <p className="text-[#D0D0D0]">
            Le site utilise des cookies fonctionnels et analytiques. Pour plus d&apos;informations,
            consultez notre politique de cookies.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-yellow-500">11. Contact</h2>
          <p className="text-[#D0D0D0]">
            Pour toute question relative à vos données personnelles : E-mail : contact@delizza.fr
          </p>
        </section>
      </div>
    </div>
  );
}
