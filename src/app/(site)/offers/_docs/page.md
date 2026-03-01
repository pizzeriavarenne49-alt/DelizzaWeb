# Page Offres — `/offers`

## But
Affiche les promotions et offres spéciales en cours. Incite à la commande via des codes promo.

## UI breakdown
1. **Titre** — "Offres"
2. **Sous-titre** — "Profitez de nos promotions exclusives"
3. **Liste d'offres** — article cards avec image (16:9), titre, contenu descriptif, date de validité (end_at)
4. **État vide** — message si aucune offre active

## Data Source — Directus CMS
Données lues via `src/data/repository.ts` avec fallback mock automatique.

| Donnée | Méthode repository | Collection Directus | Filtres |
|---|---|---|---|
| Offres | `repo.getOffers()` | `offers` | `active=true` + fenêtre `start_at`/`end_at` |

### Mapping Directus → UI
| Champ Directus | Affichage UI |
|---|---|
| `offers.title` | Titre de l'offre |
| `offers.content` | Description de l'offre |
| `offers.image` | Image bannière (via `assetUrl()`) |
| `offers.end_at` | Date "Valable jusqu'au…" |
| `offers.start_at` | Filtre côté code (non affiché) |
| `offers.active` | Master toggle (non affiché) |

### Règles de filtrage
- `active=true` obligatoire
- Si `start_at` est défini et > maintenant → offre masquée
- Si `end_at` est défini et < maintenant → offre masquée
- Les offres sans dates sont toujours visibles (tant que `active=true`)

## Redirections / events
| Action | URL | Event analytics |
|---|---|---|
| Chargement page | — | `view_offers` |
| TODO: CTA "Utiliser" | `/go?trigger=use_offer_<id>` | — |

## TODO Placeholders
- [ ] Ajouter copie dans le presse-papiers au clic sur le code
- [x] Connecter au CMS pour offres dynamiques
- [ ] Ajouter un CTA "Utiliser cette offre" → `/go?trigger=use_offer_<id>`
- [x] Gestion des offres expirées (filtre par `start_at`/`end_at`)
- [ ] Ajouter skeleton loading

## Tests manuels
1. Vérifier l'affichage de toutes les offres actives
2. Vérifier le formatage des dates en français (via `end_at`)
3. Vérifier le rendu sur mobile SE → Pro Max
4. Vérifier `view_offers` dans la console analytics
5. **CMS** : Désactiver une offre → disparaît (~60s)
6. **CMS** : Modifier `end_at` pour une date passée → offre disparaît
7. **CMS** : Ajouter une nouvelle offre active → apparaît (~60s)
8. **CMS** : Si Directus down → fallback mock, pas de crash
