# Validation Web Delizza — Acquisition & Marketing A+B

Date de validation locale : 12 octobre 2026. Checkout analysé :
`consolidate/acquisition-marketing-release-20261012`, commit `522e3ab`.

## Verdict

Le site contient bien la collecte consentie et le lien d'attribution à la commande. La collecte est désactivée par défaut à la fois dans le bundle et côté serveur : une mise en ligne technique ne peut pas, à elle seule, la mettre en service. Les appels marketing sont découplés de `createOrder` et de `createPaymentIntent`.

La publication ne doit pas être exécutée tant que le propriétaire du projet Firebase n'a pas confirmé les domaines, App Check, la source marketing, l'information de confidentialité et le fournisseur d'hébergement. Aucun fichier de déploiement Vercel, Firebase Hosting, App Hosting ou CI n'est versionné dans ce dépôt ; le code mentionne Vercel dans la politique de confidentialité, sans constituer une preuve de configuration ni de domaine.

## Comportement vérifié dans le code

- `MarketingProvider` affiche des choix équivalents Accepter, Refuser et Personnaliser, puis permet le retrait. La finalité marketing ne peut être cochée sans la finalité audience.
- La configuration publique est demandée seulement après consentement audience et doit valider source, fenêtre, durée et révision de l'information. Toute réponse invalide ou indisponible coupe la collecte locale.
- UTM, identifiant de lien et référent sont uniquement capturés avec la finalité marketing. Les événements ne transportent ni email, téléphone, adresse, panier détaillé ni montant.
- GA4 reste optionnel, chargé après consentement audience, et est retiré avec ses cookies usuels lors du retrait. Les finalités Google publicitaires restent refusées.
- La création et le paiement de commande restent les callables historiques. `marketingLinkOrder` est lancé après `createOrder`, sans attente dans le flux de commerce. Son échec ne peut donc pas bloquer panier, Stripe ou confirmation.

## Configuration nécessaire avant une recette staging

Renseigner dans le gestionnaire de variables du fournisseur d'hébergement, sans les committer :

| Objet | Paramètres attendus |
| --- | --- |
| Identité site | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_WL_APP_ID=d_lizza` |
| Firebase navigateur | les six `NEXT_PUBLIC_FIREBASE_*` documentés dans `.env.example` |
| App Check | `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` pour le domaine de recette puis le domaine public |
| Stripe | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` correspondant strictement au backend déjà approuvé |
| Rendu serveur catalogue | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`, `WL_APP_ID=d_lizza`, conservés côté serveur seulement |
| Collecte interne, technique inactive | laisser `NEXT_PUBLIC_MARKETING_ENABLED` absent ou différent de `true` |
| Collecte interne, après validation distincte | `NEXT_PUBLIC_MARKETING_SOURCE_ID`, `NEXT_PUBLIC_MARKETING_ENABLED=true`, et, si défini, `NEXT_PUBLIC_MARKETING_CONSENT_REVISION` exactement égal à la source Firebase |
| GA4 facultatif | `NEXT_PUBLIC_GA4_ID` seulement après revue des finalités et de l'information fournie |

`NEXT_PUBLIC_MARKETING_TEST_MODE` est interdit sur un déploiement public : il force le projet émulateur `demo-acquisition-marketing` et les ports locaux.

## Prérequis Firebase de staging

1. Créer ou vérifier une source marketing `d_lizza` correspondant au `sourceId` publié, avec le domaine staging exact dans les domaines autorisés.
2. Laisser `enabled`/la collecte désactivés pour la phase de publication technique. Le module doit aussi rester désactivé dans la configuration tenant tant que la revue conformité n'est pas actée.
3. Déployer d'abord les callables marketing, règles, index et TTL validés par le dépôt WLHORIZON. Vérifier App Check et l'autorisation Firebase du domaine staging.
4. Vérifier le couple Stripe live ou recette prévu, le webhook existant, et que la confirmation lit les états backend plutôt que les paramètres de retour.

## Recette staging à faire après déploiement autorisé

1. Sans consentement : aucune requête `marketingPublicConfig` ni `marketingCollect`; panier et checkout restent disponibles.
2. Refus : même résultat, et GA4 n'est pas injecté.
3. Audience seule : session, page, produit, panier et checkout sans UTM ni référent.
4. Deux finalités avec URL UTM et lien de campagne : attribution présente, chemins sans query string.
5. Retrait : arrêt immédiat local, tentative de révocation ; tester aussi une reprise réseau.
6. Commande de recette isolée : `marketingLinkOrder` non bloquant, puis rapprochement exclusivement par les écritures financières postées.
7. Indisponibilité Functions : absence d'erreur bloquante côté commande.

## Validation locale exécutée

Sans fichier `.env.local` ni variable de production :

```text
npm ci --ignore-scripts --no-audit --no-fund
npm test                         # 28 contrôles réussis
npx tsc --noEmit                 # réussi
npm run build                    # réussi, 44 routes générées
```

Le build signale l'absence attendue de source CMS réelle dans cet environnement sans variables serveur et rend alors des états vides. Cette validation ne prouve ni le CMS, ni App Check, ni Stripe, ni Firebase, ni l'hébergement effectivement configurés.

## Retour arrière

Pour la couche Web, désactiver `NEXT_PUBLIC_MARKETING_ENABLED` puis redéployer le bundle supprime immédiatement l'entrée de collecte sans toucher commandes, paiements ni données financières. Pour un retour arrière complet, restaurer le commit antérieur `a835f6e` après avoir conservé la version de configuration tenant nécessaire aux demandes de retrait déjà émises. Ne jamais utiliser ce retour arrière pour supprimer les ledgers, reçus ou données financières.
