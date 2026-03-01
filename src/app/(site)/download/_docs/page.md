# Page Téléchargement — `/download`

## But
Page store placeholder qui invite l'utilisateur à télécharger l'application native. Point d'arrivée de toutes les redirections `/go`.

## UI breakdown
1. **Logo** — icône pizza avec gradient gold (aria-hidden)
2. **Titre** — "Deli'Zza"
3. **Description** — texte incitant au téléchargement
4. **Boutons stores** — App Store + Google Play (placeholder links) avec focus-visible
5. **Lien retour** — "← Retour au site"

## Data & types
- Query param `from` (optionnel) — indique l'action source de la redirection

## Redirections / events
| Action | URL | Event analytics |
|---|---|---|
| Chargement page | — | `view_download` avec `{ from }` |

## TODO Placeholders
- [ ] Remplacer `#apple-store-placeholder` par le vrai lien App Store
- [ ] Remplacer `#google-play-placeholder` par le vrai lien Google Play
- [ ] Ajouter détection OS pour mettre en avant le bon store
- [ ] Ajouter un QR code pour le scan desktop
- [ ] Tracking analytics des conversions (clics store)

## Tests manuels
1. Vérifier le centrage vertical et horizontal
2. Vérifier que les boutons stores ont le bon style
3. Vérifier que le lien retour fonctionne
4. Tester l'arrivée depuis `/go?trigger=test` → doit afficher `/download?from=test`
5. Vérifier `view_download` dans la console analytics
6. Vérifier les focus-visible outlines
