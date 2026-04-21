import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Suppression de compte — Pizza Deli'Zza",
  description:
    "Supprimez votre compte Pizza Deli'Zza et vos données personnelles conformément au RGPD.",
};

const deleteAccountJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Suppression de compte — Pizza Deli'Zza",
  url: "https://www.delizza.fr/delete-account",
  inLanguage: "fr-FR",
};

export default function DeleteAccountPage() {
  return (
    <div className="bg-[#0D0D0D] px-4 py-10 text-[#F5F5F5] md:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(deleteAccountJsonLd) }}
      />

      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-4">
          <span className="inline-flex rounded-full border border-yellow-500/50 bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-500">
            Application Pizza Deli&apos;Zza
          </span>
          <h1 className="text-3xl font-bold text-yellow-500">Suppression de compte – Pizza Deli&apos;Zza</h1>
          <p className="text-[#D0D0D0]">
            Cette page concerne l&apos;application mobile Pizza Deli&apos;Zza (disponible sur Google
            Play et App Store).
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-yellow-500">Comment supprimer votre compte ?</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-yellow-500/30 bg-[#151515] p-5">
              <h3 className="text-lg font-semibold text-[#F5F5F5]">
                Option 1 — Depuis l&apos;application (recommandé)
              </h3>
              <ol className="mt-4 space-y-3 text-[#D0D0D0]">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 text-sm font-bold text-[#0D0D0D]">
                    1
                  </span>
                  <span>Ouvrez l&apos;application Pizza Deli&apos;Zza</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 text-sm font-bold text-[#0D0D0D]">
                    2
                  </span>
                  <span>Accédez à &quot;Mon compte&quot; (icône en bas à droite)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 text-sm font-bold text-[#0D0D0D]">
                    3
                  </span>
                  <span>Appuyez sur &quot;Supprimer mon compte&quot;</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 text-sm font-bold text-[#0D0D0D]">
                    4
                  </span>
                  <span>Confirmez la suppression</span>
                </li>
              </ol>
              <p className="mt-4 font-medium text-[#F5F5F5]">
                La suppression est immédiate et irréversible.
              </p>
            </article>

            <article className="rounded-2xl border border-yellow-500/30 bg-[#151515] p-5">
              <h3 className="text-lg font-semibold text-[#F5F5F5]">Option 2 — Par e-mail</h3>
              <div className="mt-4 space-y-3 text-[#D0D0D0]">
                <p>
                  Envoyez une demande de suppression à :{" "}
                  <a
                    href="mailto:contact@delizza.fr"
                    className="font-semibold text-yellow-500 underline underline-offset-2"
                  >
                    contact@delizza.fr
                  </a>
                </p>
                <p>Objet : &quot;Suppression de compte&quot;</p>
                <p>Précisez l&apos;adresse e-mail associée à votre compte.</p>
                <p className="font-medium text-[#F5F5F5]">Délai de traitement : 30 jours maximum.</p>
              </div>
            </article>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-yellow-500">Données supprimées</h2>
          <p className="text-[#D0D0D0]">Les données suivantes seront supprimées :</p>
          <ul className="list-disc space-y-2 pl-5 text-[#D0D0D0]">
            <li>Votre compte utilisateur (email, nom, prénom)</li>
            <li>Vos données personnelles</li>
            <li>Votre historique de commandes associé</li>
            <li>Vos préférences et paramètres</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-yellow-500">Données conservées</h2>
          <p className="text-[#D0D0D0]">
            Certaines données peuvent être conservées pour respecter nos obligations légales :
          </p>
          <ul className="list-disc space-y-2 pl-5 text-[#D0D0D0]">
            <li>Données de facturation et comptables (durée légale : 10 ans)</li>
            <li>Données nécessaires à la résolution de litiges en cours</li>
          </ul>
          <p className="text-[#D0D0D0]">
            Ces données sont conservées uniquement le temps nécessaire et ne sont pas utilisées à
            d&apos;autres fins.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-yellow-500">Questions ?</h2>
          <p className="text-[#D0D0D0]">
            Contactez-nous :{" "}
            <a
              href="mailto:contact@delizza.fr"
              className="font-semibold text-yellow-500 underline underline-offset-2"
            >
              contact@delizza.fr
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
