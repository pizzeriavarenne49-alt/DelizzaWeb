# Analytics Module — `src/analytics/`

## But
Module d'analytics interne léger. Log les événements en console avec une API stable prête à être branchée sur un backend réel (Mixpanel, Amplitude, custom endpoint).

## API publique

```ts
import { track } from "@/analytics";

track({ name: "click_hero_cta", payload: { slideId: "slide1" } });
```

## Catalogue d'événements

| Événement | Payload | Déclencheur |
|---|---|---|
| `view_home` | — | Chargement page `/` |
| `view_menu` | — | Chargement page `/menu` |
| `view_offers` | — | Chargement page `/offers` |
| `view_profile` | — | Chargement page `/profile` |
| `view_download` | `{ from?: string }` | Chargement page `/download` |
| `click_hero_cta` | `{ slideId: string }` | Clic CTA carousel hero |
| `click_add_product` | `{ productId: string }` | Clic bouton "+" sur ProductCard |
| `click_menu` | — | Clic onglet Menu (bottom nav) |
| `click_offers` | — | Clic onglet Offres (bottom nav) |
| `open_go` | `{ trigger: string, os: string }` | Ouverture route `/go` |
| `close_install_banner` | — | Fermeture bandeau install |
| `show_install_banner` | `{ reason: string }` | Affichage bandeau install |

## Transport actuel
Console log avec couleurs (gold/white). Format :
```
[analytics] event_name { payload } @ ISO timestamp
```

## TODO
- [ ] Brancher un vrai transport (fetch POST vers /api/analytics ou service tiers)
- [ ] Ajouter batching et retry
- [ ] Ajouter identification utilisateur (userId)
- [ ] Ajouter session tracking

## Tests manuels
1. Ouvrir la console navigateur
2. Naviguer sur `/` → vérifier `view_home` apparaît
3. Cliquer "Commander" sur le carousel → vérifier `click_hero_cta`
4. Cliquer "+" sur un produit → vérifier `click_add_product`
5. Fermer le bandeau install → vérifier `close_install_banner`
