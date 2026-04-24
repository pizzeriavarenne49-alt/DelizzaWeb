/**
 * Mode "Ouverture prochaine"
 * ─────────────────────────
 * true  → overlay actif, site bloqué
 * false → site normal
 *
 * Priorité : variable d'environnement NEXT_PUBLIC_COMING_SOON (string "true")
 * puis fallback sur la constante ci-dessous.
 */
export const COMING_SOON: boolean =
  process.env.NEXT_PUBLIC_COMING_SOON === "true" || true;
