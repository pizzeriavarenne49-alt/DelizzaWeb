# Acquisition & Marketing — intégration Web Delizza

## Activation

La collecte interne est inactive par défaut. En production, elle exige les deux variables publiques :

```text
NEXT_PUBLIC_MARKETING_SOURCE_ID=delizza-web-production
NEXT_PUBLIC_MARKETING_ENABLED=true
```

En développement et tests isolés, elle reste inactive sauf `NEXT_PUBLIC_MARKETING_TEST_MODE=true`.
Le `sourceId` est un identifiant de configuration public, jamais un secret. La Cloud Function reste
responsable de vérifier le domaine, l'établissement et les limites de volume.

Le mode test est volontairement strict : il exige `NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-acquisition-marketing`
et connecte Auth, Firestore et Functions aux émulateurs `127.0.0.1:9909`, `:9808` et `:9501`.
Il ne peut donc pas appeler un projet Firebase de production.

## Consentement et vie privée

Le bandeau offre accepter, refuser et personnaliser au même niveau. Les trois finalités audience,
attribution marketing et mesure publicitaire Meta sont indépendantes. Les choix sont stockés six mois
sur l'appareil. Les événements internes, l'identifiant visiteur et les agrégats exigent le consentement
d'audience. Les paramètres de campagne et le référent exigent le consentement marketing. Les identifiants
de rapprochement Meta exigent son consentement dédié. Le retrait efface la file, les identifiants et demande une révocation serveur
avec le jeton opaque reçu lors de la collecte. Hors réseau, seule la capacité nécessaire à cette
révocation est conservée sept jours au plus et rejouée à la prochaine connexion. La collecte et
GA4 sont arrêtés immédiatement ; l’effacement serveur attend le retour du réseau. Cette implémentation requiert une revue juridique avant
activation publique.

Après l'opt-in seulement, `marketingPublicConfig({ appId, sourceId })` récupère la configuration
autorisée par le serveur (`enabled`, `attributionWindowDays`, `sessionRetentionDays`, `consentRevision`). `consentRevision`
doit correspondre exactement à la version de l'information affichée (`NEXT_PUBLIC_MARKETING_CONSENT_REVISION`, défaut
`2026-10-12`) : le client ne modifie jamais rétroactivement la preuve d'un choix. Sans réponse valide,
la collecte interne reste désactivée. La fenêtre d'attribution et la durée de l'identifiant visiteur
ne possèdent pas de valeur cliente de repli ; elles viennent de `attributionWindowDays`.

GA4, s'il est configuré, ne charge son script qu'après le consentement audience. Un retrait désactive
la mesure, retire le script monté par le site et efface les cookies GA usuels du domaine courant
et de ses parents. Google Signals et les finalités publicitaires restent désactivés. Les pages
GA4 sont envoyées avec origin/pathname uniquement, sans query/hash ni référent détaillé.

## Contrat de collecte

`marketingCollect` reçoit des lots de vingt événements maximum :

```ts
{
  schemaVersion: 1,
  appId: "d_lizza",
  sourceId,
  session: { id, visitorId, startedAt },
  consent: { analytics, marketing, revision, updatedAt },
  events: [{ id, type, occurredAt, path?, productId?, quantity?, errorCode? }],
  attribution?: { utm_id?, utm_source?, utm_medium?, utm_campaign?, utm_content?, utm_term?, referrerDomain?, landingPath?, campaignLinkId? }
}
```

Les identifiants sont générés dans le navigateur et les appels sont asynchrones. La file est bornée à
100 événements, les reprises à trois essais et les URL sont réduites au chemin sans query string.
Le collecteur ne transporte ni email, téléphone, nom, adresse, panier détaillé ni montant.

Les événements Web sont `session_start`, `page_view`, `campaign_visit`, `product_view`,
`add_to_cart`, `remove_from_cart`, `checkout_start` et `checkout_error`. Les ventes, paiements,
achats récurrents et remboursements proviennent exclusivement des traitements serveur/financiers.

## Attribution et commande

Après `createOrder`, le navigateur lance sans attendre `marketingLinkOrder` :

```ts
{ appId, orderId, context: { sessionId, sourceId, attributionToken? } }
```

Cet appel est séparé de la création de commande et du paiement. Son échec ne bloque jamais le
commerce. La file reprend après reconnexion, au chargement et depuis la confirmation de commande.
Le backend doit
vérifier que l'utilisateur authentifié possède la commande et que le contexte appartient au même
tenant. L'attribution est une mesure déclarative, non une mesure d'incrémentalité.

## Mesure publicitaire Meta

La mesure nécessite une configuration Meta autorisée sur le serveur pour la même source et le même domaine, puis ces valeurs sur le site.

```text
NEXT_PUBLIC_MARKETING_SOURCE_ID=delizza-web-production
NEXT_PUBLIC_MARKETING_ENABLED=true
NEXT_PUBLIC_MARKETING_CONSENT_REVISION=2026-11-05-v2
NEXT_PUBLIC_META_ADVERTISING_ENABLED=true
```

Le serveur doit retourner `metaPixelId` dans la configuration vérifiée. Ce numéro est public. Le jeton Conversions API reste côté serveur. La révision demande un nouveau choix explicite. La mesure Meta est séparée de l'attribution interne des UTM et de la mesure d'audience dans les préférences. Le client transmet seulement un contexte minimal sans compteur, agrégat ni identifiant visiteur lorsque l'audience est refusée.

Dans Meta Ads Manager, renseigner les paramètres de l'URL publicitaire avec `utm_source=meta&utm_medium=paid_social&utm_id={{campaign.id}}`. L'identifiant stable `utm_id` permet de rapprocher les commandes mesurables et les dépenses importées, y compris après renommage de la campagne. Une commande issue d'un visiteur qui refuse la mesure marketing interne reste sans attribution UTM dans WLHORIZON.

Avec consentement Meta, le navigateur initialise le Pixel sans configuration automatique. Il émet `PageView`, `ViewContent`, `AddToCart` et `InitiateCheckout` à partir des événements réels du site. Le collecteur peut recevoir `_fbp` et `_fbc` au sein de cette session. Une redirection Stripe contenant des paramètres privés est exclue des appels Pixel. Le serveur peut transmettre l'achat confirmé par la Conversions API pour les commandes couvertes par le consentement et la liaison.

Le navigateur émet `Purchase` seulement pour une commande web du compte connecté, confirmée par un document Firestore issu du serveur avec paiement complet, montant et devise validés. L'identifiant de déduplication est un UUID opaque préfixé par `meta-`, généré seulement après le consentement Meta. Le navigateur ne l'arme dans l'onglet qu'après confirmation par le callable autorisé de l'identifiant canonique lié à la commande, que l'événement serveur reprend à l'identique. Aucun identifiant de commande n'est transmis comme `eventID` à Meta. Avec consentement Meta, la page de confirmation conserve d'abord sa référence dans le stockage d'onglet, puis retire définitivement ses paramètres et son fragment avant l'envoi éventuel. Si ce stockage n'est pas disponible, elle conserve l'URL normale et bloque `Purchase` côté navigateur. Toute URL portant des paramètres ou un fragment est refusée pour `Purchase`. Le marqueur d'achat envoyé est conservé une heure dans l'onglet afin qu'une reprise du callable ne puisse pas émettre un second achat navigateur. Le retrait du consentement arrête les envois, efface les traceurs Meta disponibles et révoque les sessions précédentes côté serveur. La révocation peut être rejouée après reconnexion.

Pour la recette sur un jeu de données de test, contrôler dans Meta Events Manager que les événements de navigation et la valeur d'achat correspondent, que l'achat navigateur et l'achat serveur portent le même identifiant, et qu'un refus ou retrait empêche tout nouvel envoi. Contrôler aussi un retour Stripe qui exige une redirection et un achat échoué.

## Tests manuels isolés

1. Sans variables marketing, aucun callable marketing n'est invoqué.
2. Avec le mode test isolé, refuser : aucune file ni appel de collecte ne subsiste.
3. Accepter audience seule : pages, produits, panier et checkout sont collectés sans UTM/référent.
4. Accepter les deux finalités sur une URL UTM : `campaign_visit` et l'attribution sont présents,
   sans query string dans `path`.
5. Retirer le consentement : GA4 est désactivé, stockage et file sont nettoyés, révocation tentée.
6. Créer une commande de test avec un compte isolé : l'appel de lien marketing échoue sans modifier
   la commande ni le paiement, puis réussit lorsque le callable est disponible.
