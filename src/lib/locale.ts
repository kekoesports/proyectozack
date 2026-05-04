/**
 * Detección de idioma por pathname para el chrome (Footer/Nav) y el LangSwitch.
 *
 * Las páginas EN de la web se enumeran aquí. Cualquier ruta no listada se
 * considera ES (incluida la home `/`, blog, slugs dinámicos, etc.).
 */

export type Locale = 'en' | 'es';

export const EN_PATHS: ReadonlySet<string> = new Set([
  // Páginas de marketing core
  '/en',
  '/services',
  '/talents',
  '/cases',
  '/contact',
  // Landings SEO con par EN
  '/cs2-influencer-marketing',
  '/valorant-influencers-agency',
  '/betting-influencers',
  '/esports-marketing-agency',
  '/twitch-streamers-agency',
]);

export function localeFromPathname(pathname: string): Locale {
  return EN_PATHS.has(pathname) ? 'en' : 'es';
}
