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

## Data & types
- `heroSlides` → `HeroSlide[]` (filtré `active: true`, trié par `order`)
- `categories` → `Category[]`
- `products` → `Product[]` (filtré `active: true`, "Populaire" = `isPopular: true`)

## Redirections / events
| Action | URL | Event analytics |
|---|---|---|
| CTA "Commander" (carousel) | `/go?trigger=hero_cta_<slideId>` | `click_hero_cta` |
| Bouton "+" (product card) | `/go?trigger=add_<productId>` | `click_add_product` |
| "Voir le menu complet" | `/go?trigger=see_menu` | — |
| "Voir tout" (section header) | `/menu` | — |
| Chargement page | — | `view_home` |

## TODO Placeholders
- [ ] Remplacer "Bonjour Alex" par nom réel utilisateur (auth)
- [ ] Connecter données produits au CMS (Directus/Strapi)
- [ ] Implémenter deep links réels dans `/go`
- [ ] Ajouter images réelles pour les slides et produits
- [ ] Implémenter skeleton loading pendant chargement CMS

## Tests manuels
1. Vérifier l'affichage sur iPhone SE (320px) → iPhone Pro Max (430px)
2. Tester le scroll horizontal des chips sans scrollbar visible
3. Vérifier que le carousel auto-play change de slide toutes les 5s
4. Vérifier que les dots de pagination reflètent le slide actif
5. Tester la recherche : taper "truffe" doit filtrer les résultats
6. Vérifier le filtre "Populaire" : uniquement les produits avec `isPopular: true`
7. Vérifier que le bouton "+" redirige vers `/go?trigger=add_<id>`
8. Vérifier les focus-visible outlines sur tous les éléments interactifs
9. Vérifier les événements analytics dans la console (view_home, click_hero_cta, etc.)
10. Vérifier que le bandeau install N'apparaît PAS immédiatement (12s ou 50% scroll)
