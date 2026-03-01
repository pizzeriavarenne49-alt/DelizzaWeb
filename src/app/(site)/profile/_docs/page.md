# Page Profil — `/profile`

## But
Page placeholder de profil utilisateur. Interface simple mais visuellement cohérente avec le design system.

## UI breakdown
1. **Titre** — "Profil"
2. **Avatar + Nom** — placeholder avec gradient gold, aria-hidden sur avatar
3. **Liste d'options** — Commandes, Adresses, Paiement, Notifications, Aide (role="list")
4. **CTA téléchargement** — lien vers `/download` avec focus-visible

## Data & types
- Données utilisateur en dur (placeholder)

## Redirections / events
| Action | URL | Event analytics |
|---|---|---|
| Chargement page | — | `view_profile` |
| CTA "Télécharger" | `/download` | — |

## TODO Placeholders
- [ ] Connecter à l'authentification réelle
- [ ] Rendre les options de menu fonctionnelles (navigation vers sous-pages)
- [ ] Ajouter une page de déconnexion
- [ ] Récupérer les vraies données utilisateur

## Tests manuels
1. Vérifier le rendu de l'avatar avec gradient gold
2. Vérifier que toutes les options sont listées
3. Vérifier que le CTA redirige vers `/download`
4. Vérifier le rendu responsive
5. Vérifier `view_profile` dans la console analytics
6. Vérifier les focus-visible outlines
