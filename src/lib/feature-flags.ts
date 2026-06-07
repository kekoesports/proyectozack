/**
 * Feature flags de compilación — valores booleanos resueltos en build time.
 *
 * Cuando ESTADISTICAS_NOINDEX pase a false, completar también:
 *   1. Añadir { url: absoluteUrl('/estadisticas'), ... } en src/app/sitemap.ts
 *   2. Verificar que ranking y Twitch roster tienen datos reales
 *   3. Confirmar 3+ artículos de categoría 'estadisticas' publicados
 */
export const ESTADISTICAS_NOINDEX = true;
