# Page Offres — `/offers`

## But
Affiche les promotions et offres spéciales en cours. Incite à la commande via des codes promo.

## UI breakdown
1. **Titre** — "Offres"
2. **Sous-titre** — "Profitez de nos promotions exclusives"
3. **Liste d'offres** — article cards avec image (16:9), badge discount, titre, description, code promo, date de validité (endAt)

## Data & types
- `offers` → `Offer[]` (avec champs `startAt`, `endAt`)
- Date affichée: `endAt` formaté en français

## Redirections / events
| Action | URL | Event analytics |
|---|---|---|
| Chargement page | — | `view_offers` |
| TODO: CTA "Utiliser" | `/go?trigger=use_offer_<id>` | — |

## TODO Placeholders
- [ ] Ajouter copie dans le presse-papiers au clic sur le code
- [ ] Connecter au CMS pour offres dynamiques
- [ ] Ajouter un CTA "Utiliser cette offre" → `/go?trigger=use_offer_<id>`
- [ ] Gestion des offres expirées (affichage grisé, filtre par `startAt`/`endAt`)
- [ ] Ajouter skeleton loading

## Tests manuels
1. Vérifier l'affichage de toutes les offres
2. Vérifier le formatage des dates en français (via `endAt`)
3. Vérifier l'affichage du badge discount sur l'image
4. Vérifier le rendu sur mobile SE → Pro Max
5. Vérifier `view_offers` dans la console analytics
