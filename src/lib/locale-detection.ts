/**
 * Lógica pura de detección de idioma para el middleware de geo-redirección.
 * Sin dependencias de Next.js — importable en tests y en edge runtime.
 */

export const LOCALE_COOKIE = 'socialpro_locale';

export const LOCALE_COOKIE_MAX_AGE = 31536000; // 1 año

/** Rutas a las que aplica el middleware de detección. */
export const LOCALE_MIDDLEWARE_MATCHER = ['/', '/en'] as const;

/**
 * Países hispanohablantes — visitantes de estos países reciben ES.
 * Resto → EN (si el país es conocido y no está aquí).
 */
export const SPANISH_COUNTRIES: ReadonlySet<string> = new Set([
  'ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'UY', 'PY', 'BO', 'EC',
  'VE', 'CR', 'PA', 'DO', 'GT', 'HN', 'SV', 'NI', 'CU', 'PR',
]);

/**
 * Devuelve el locale preferido basado en:
 * 1. x-vercel-ip-country (si está disponible)
 * 2. accept-language (si empieza por 'es')
 * 3. Default ES (mercado principal)
 *
 * No hace llamadas externas ni almacena IP.
 */
export function detectPreferredLocale(
  country: string | null | undefined,
  acceptLanguage: string | null | undefined,
): 'es' | 'en' {
  // País conocido → decide directamente
  if (country) {
    return SPANISH_COUNTRIES.has(country) ? 'es' : 'en';
  }
  // Sin país: fallback a accept-language
  if (acceptLanguage?.toLowerCase().startsWith('es')) return 'es';
  // Sin información → default ES
  return 'es';
}

export type LocaleDecision =
  | { action: 'pass'; locale: 'es' | 'en'; writeCookie: boolean }
  | { action: 'redirect'; to: '/' | '/en'; locale: 'es' | 'en' };

/**
 * Función pura que decide si redirigir o pasar, y qué cookie escribir.
 * Usada tanto por el middleware como por los tests.
 */
export function getLocaleDecision(opts: {
  readonly pathname: string;
  readonly cookieLocale: string | undefined;
  readonly country: string | null | undefined;
  readonly acceptLanguage: string | null | undefined;
}): LocaleDecision {
  const { pathname, cookieLocale, country, acceptLanguage } = opts;

  // Cookie válida presente → respetar siempre, sin redirigir ni reescribir
  if (cookieLocale === 'es' || cookieLocale === 'en') {
    return { action: 'pass', locale: cookieLocale, writeCookie: false };
  }

  const preferred = detectPreferredLocale(country, acceptLanguage);
  const currentLocale: 'es' | 'en' = pathname === '/en' ? 'en' : 'es';

  // Ya en el locale correcto → pasar y establecer cookie para no recalcular
  if (currentLocale === preferred) {
    return { action: 'pass', locale: preferred, writeCookie: true };
  }

  // Locale incorrecto → redirigir y establecer cookie
  return {
    action: 'redirect',
    to: preferred === 'en' ? '/en' : '/',
    locale: preferred,
  };
}
