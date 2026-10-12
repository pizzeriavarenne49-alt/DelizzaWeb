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

Le bandeau offre accepter, refuser et personnaliser au même niveau. Les choix sont stockés six mois
sur l'appareil. Aucun événement interne, identifiant de session/visiteur, UTM ou référent n'est lu
avant le consentement d'audience. Les paramètres de campagne et le référent exigent en plus le
consentement marketing. Le retrait efface la file, les identifiants et demande une révocation serveur
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
  attribution?: { utm_source?, utm_medium?, utm_campaign?, utm_content?, utm_term?, referrerDomain?, landingPath?, campaignLinkId? }
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
commerce ; il laisse seulement la commande sans attribution jusqu'à une reprise. Le backend doit
vérifier que l'utilisateur authentifié possède la commande et que le contexte appartient au même
tenant. L'attribution est une mesure déclarative, non une mesure d'incrémentalité.

## Tests manuels isolés

1. Sans variables marketing, aucun callable marketing n'est invoqué.
2. Avec le mode test isolé, refuser : aucune file ni appel de collecte ne subsiste.
3. Accepter audience seule : pages, produits, panier et checkout sont collectés sans UTM/référent.
4. Accepter les deux finalités sur une URL UTM : `campaign_visit` et l'attribution sont présents,
   sans query string dans `path`.
5. Retirer le consentement : GA4 est désactivé, stockage et file sont nettoyés, révocation tentée.
6. Créer une commande de test avec un compte isolé : l'appel de lien marketing échoue sans modifier
   la commande ni le paiement, puis réussit lorsque le callable est disponible.
