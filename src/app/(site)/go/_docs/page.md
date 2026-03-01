# Page Redirect — `/go`

## But
Point de redirection intelligente. Tente d'ouvrir l'app native via deep link (`delizza://`), puis fallback vers le store ou `/download`.

## Structure UI
1. **Spinner** — indicateur de chargement pendant la tentative deep link
2. **Texte** — "Redirection en cours…"

## Data & types
- Query params: `trigger` (action source), `utm_source`, `utm_campaign` (tracking)
- `Platform` type: `"ios" | "android" | "desktop"`

## Logique de redirection
1. Détecter la plateforme via User-Agent
2. Si desktop → redirect immédiat vers `/download?from=<trigger>`
3. Si mobile → tenter `delizza://action?trigger=<trigger>`
4. Après 1.5s timeout, si la page est encore visible → fallback `/download` (ou store URL quand dispo)

## Événements analytics
- `open_go` — `{ trigger, os }` à l'ouverture

## TODO Placeholders
- [ ] Remplacer `delizza://` par le vrai scheme de l'app
- [ ] Remplacer les URLs de store placeholder par les vrais liens
- [ ] Ajouter Universal Links / App Links pour iOS/Android
- [ ] Ajouter logging serveur des redirections

## Tests manuels
1. Ouvrir `/go?trigger=test` sur desktop → doit rediriger vers `/download?from=test`
2. Vérifier que le spinner s'affiche brièvement
3. Vérifier l'événement `open_go` dans la console
4. Sur mobile (DevTools device mode) → vérifier la tentative deep link
