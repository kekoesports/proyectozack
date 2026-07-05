/**
 * Feature flags de compilación — valores booleanos resueltos en build time.
 *
 * Cuando ESTADISTICAS_NOINDEX pase a false, completar también:
 *   1. Añadir { url: absoluteUrl('/estadisticas'), ... } en src/app/sitemap.ts
 *   2. Verificar que ranking y Twitch roster tienen datos reales
 *   3. Confirmar 3+ artículos de categoría 'estadisticas' publicados
 */
export const ESTADISTICAS_NOINDEX = true;

/* ------------------------------------------------------------------ *
 * Fase 0 — bloqueo de riesgos legales antes de producción
 * Ver docs/legal-risk-matrix.md · docs/external-partners.md
 * ------------------------------------------------------------------ *
 * Valores globales por defecto. La decisión final por país se resuelve
 * en `src/lib/geo-legal-config.ts` combinando estos flags con el país
 * detectado server-side (x-vercel-ip-country).
 *
 * Cuando gestoría firme la revisión de KeyDrop (R1) se puede
 * flipar KEYDROP_EXTERNAL_CTAS_ENABLED a true para reactivar en ES.
 */
export const KEYDROP_EXTERNAL_CTAS_ENABLED = false;
export const EXTERNAL_PARTNER_CTAS_ENABLED = false;
export const WAGERING_COPY_ALLOWED        = false;
export const GIFT_CARDS_REWARDS_ENABLED   = false;
export const SKINS_REWARDS_ENABLED        = true;
export const MERCH_REWARDS_ENABLED        = true;
