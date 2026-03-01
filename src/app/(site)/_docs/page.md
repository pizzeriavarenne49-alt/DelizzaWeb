# Page d'accueil — `/`

## But
Page principale app-like affichant le menu en mode découverte, les promos et les suggestions produits. Point d'entrée principal du site mobile. Convaincre l'utilisateur puis rediriger intelligemment vers l'app.

## UI breakdown
1. **Header** — logo "Deli'Zza", greeting placeholder ("Bonjour Alex,"), avatar badge → link `/profile`
2. **Hero Carousel** — slides promotionnels avec image cinématique, overlay gradient, badge gold, titre, CTA "Commander", prix en pastille gold, dots de pagination, auto-play 5s
3. **Search Bar** — style iOS (surface sombre + blur), focus ring gold, placeholder "Rechercher…"
4. **Chips catégories** — scroll horizontal inertiel (Populaire, Pizzas, Entrées, Desserts, Promos), état actif gold, hover/press states
5. **Section Suggestions** — grille 2 colonnes de ProductCards (photo 4:3, nom clamp-1, description clamp-2, prix, bouton "+")
6. **CTA Section** — redirection vers le menu complet via `/go`

## Data Source — Directus CMS
Données lues via `src/data/repository.ts` avec fallback mock automatique.

| Donnée | Méthode repository | Collection Directus | Filtres |
|---|---|---|---|
| Hero slides | `repo.getHomeHeroSlides()` | `home_hero_slides` | `active=true`, tri `order ASC` |
| Catégories | `repo.getCategories()` | `categories` | `active=true`, tri `order ASC` |
| Produits | `repo.getProducts()` | `products` | `active=true` |

### Mapping Directus → UI
| Champ Directus | Affichage UI |
|---|---|
| `home_hero_slides.title` | Titre du slide |
| `home_hero_slides.subtitle` | Sous-titre gold |
| `home_hero_slides.badge` | Badge gold (top-left) |
| `home_hero_slides.price_cents` | Pastille prix (divisé par 100) |
| `home_hero_slides.cta_label` | Texte bouton CTA |
| `home_hero_slides.cta_target` | Lien CTA |
| `products.name` | Nom produit |
| `products.description_short` | Description sous le nom |
| `products.price_cents` | Prix (divisé par 100, format `XX.XX €`) |
| `products.is_popular` | Filtre "Populaire" |
| `categories.name` | Label du chip |

## Redirections / events
| Action | URL | Event analytics |
|---|---|---|
| CTA "Commander" (carousel) | `slide.cta_target` | `click_hero_cta` |
| Bouton "+" (product card) | `/go?trigger=add_<productId>` | `click_add_product` |
| "Voir le menu complet" | `/go?trigger=see_menu` | — |
| "Voir tout" (section header) | `/menu` | — |
| Chargement page | — | `view_home` |

## TODO Placeholders
- [ ] Remplacer "Bonjour Alex" par nom réel utilisateur (auth)
- [x] Connecter données produits au CMS (Directus)
- [ ] Implémenter deep links réels dans `/go`
- [ ] Ajouter images réelles pour les slides et produits
- [ ] Implémenter skeleton loading pendant chargement CMS

## Tests manuels
1. Vérifier l'affichage sur iPhone SE (320px) → iPhone Pro Max (430px)
2. Tester le scroll horizontal des chips sans scrollbar visible
3. Vérifier que le carousel auto-play change de slide toutes les 5s
4. Vérifier que les dots de pagination reflètent le slide actif
5. Tester la recherche : taper "truffe" doit filtrer les résultats
6. Vérifier le filtre "Populaire" : uniquement les produits avec `is_popular: true`
7. Vérifier que le bouton "+" redirige vers `/go?trigger=add_<id>`
8. Vérifier les focus-visible outlines sur tous les éléments interactifs
9. Vérifier les événements analytics dans la console (view_home, click_hero_cta, etc.)
10. Vérifier que le bandeau install N'apparaît PAS immédiatement (12s ou 50% scroll)
11. **CMS** : Désactiver un produit dans Directus → disparaît de la home sans redéploiement
12. **CMS** : Modifier l'ordre d'un hero slide → reflété sur la home
13. **CMS** : Si Directus down → fallback mock, pas de crash
