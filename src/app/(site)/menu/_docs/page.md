# Page Menu — `/menu`

## But
Liste complète des produits avec filtres par catégorie et recherche textuelle. Permet de parcourir tout le catalogue.

## UI breakdown
1. **Titre** — "Menu"
2. **Search Bar** — recherche textuelle avec focus ring gold
3. **Chips catégories** — filtre horizontal identique à la home, aria-pressed
4. **Section Header** — titre dynamique selon la catégorie active
5. **Grille produits** — 2 colonnes de ProductCards (aspect 4:3, clamp, prix)
6. **État vide** — message si aucun résultat

## Data Source — Directus CMS
Données lues via `src/data/repository.ts` avec fallback mock automatique.

| Donnée | Méthode repository | Collection Directus | Filtres |
|---|---|---|---|
| Catégories | `repo.getCategories()` | `categories` | `active=true`, tri `order ASC` |
| Produits | `repo.getProducts()` | `products` | `active=true` |

### Mapping Directus → UI
| Champ Directus | Affichage UI |
|---|---|
| `categories.name` | Label du chip catégorie |
| `categories.id` | Clé de filtre (`product.category === cat.id`) |
| `products.name` | Nom produit (ProductCard) |
| `products.description_short` | Description sous le nom |
| `products.price_cents` | Prix (divisé par 100, format `XX.XX €`) |
| `products.category` | FK pour filtre par catégorie |
| `products.image` | Photo produit (via `assetUrl()`) |
| `products.badge` | Badge (Best-seller, Premium…) |

## Redirections / events
| Action | URL | Event analytics |
|---|---|---|
| Bouton "+" (product card) | `/go?trigger=add_<productId>` | `click_add_product` |
| Chargement page | — | `view_menu` |

## TODO Placeholders
- [x] Connecter au CMS pour données réelles
- [ ] Ajouter pagination ou infinite scroll si beaucoup de produits
- [ ] Ajouter tri par prix/popularité
- [ ] Skeleton loading pendant chargement CMS

## Tests manuels
1. Vérifier l'affichage grille 2 colonnes sur mobile
2. Tester la recherche "margherita" → doit montrer la Margherita Classica
3. Changer de catégorie : vérifier que seuls les produits de la catégorie s'affichent
4. Combiner recherche + catégorie : vérifier le double filtre
5. Tester l'état vide avec une recherche impossible (ex: "xyz")
6. Vérifier `view_menu` dans la console analytics
7. Vérifier les focus-visible outlines
8. **CMS** : Désactiver un produit → disparaît du menu (~120s)
9. **CMS** : Modifier prix → visible sur le menu (~120s)
10. **CMS** : Modifier ingrédients → visible sur la fiche produit
11. **CMS** : Si Directus down → fallback mock, pas de crash
