/**
 * Rutas cuyo contenido está en inglés. Usado por el root layout para decidir
 * `<html lang>` y por cualquier otro componente que necesite conocer el
 * locale de la ruta actual.
 *
 * Actualizar cuando se añada una nueva ruta EN. Fase 4 del sprint SEO+GEO
 * 2026-07 traducirá el resto de landings y algunas de estas cambiarán de
 * canónica.
 */

export const EN_ROUTES: ReadonlyArray<string> = [
  '/en',
  '/talents',
  '/services',
  '/cases',
  '/contact',
  '/cs2-influencer-marketing',
  '/valorant-influencers-agency',
  '/betting-influencers',
  '/esports-marketing-agency',
  '/twitch-streamers-agency',
];

/**
 * `true` si el pathname corresponde a contenido en inglés. Cubre coincidencia
 * exacta y subrutas (por ejemplo `/en/algo`).
 */
export function isEnPathname(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return EN_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}
