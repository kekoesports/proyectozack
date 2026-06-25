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
 *
 * Prioridad:
 * 1. Geo (país hispanohablante) → siempre sirve español, incluso si cookie dice 'en'.
 *    Evita que una cookie caducada bloquee a usuarios españoles en /en.
 * 2. Sin país confirmado → respeta el cookie para evitar bucles de redirección.
 * 3. Sin cookie ni país → usa accept-language (default: 'es').
 */
export function getLocaleDecision(opts: {
  readonly pathname: string;
  readonly cookieLocale: string | undefined;
  readonly country: string | null | undefined;
  readonly acceptLanguage: string | null | undefined;
}): LocaleDecision {
  const { pathname, cookieLocale, country, acceptLanguage } = opts;
  const currentLocale: 'es' | 'en' = pathname === '/en' ? 'en' : 'es';

  // País hispanohablante detectado → geo gana sobre el cookie
  if (country && SPANISH_COUNTRIES.has(country)) {
    if (currentLocale === 'es') {
      // Ya en español — pasar. Si el cookie decía 'en', corregirlo silenciosamente.
      return { action: 'pass', locale: 'es', writeCookie: cookieLocale !== 'es' };
    }
    // Está en /en pero el país es hispanohablante → redirigir a /
    return { action: 'redirect', to: '/', locale: 'es' };
  }

  // País no hispanohablante (o sin país): el cookie manda para evitar bucles
  if (cookieLocale === 'es' || cookieLocale === 'en') {
    return { action: 'pass', locale: cookieLocale, writeCookie: false };
  }

  // Sin cookie ni país confirmado: detectar por accept-language (default: 'es')
  const preferred = detectPreferredLocale(country, acceptLanguage);
  if (currentLocale === preferred) {
    return { action: 'pass', locale: preferred, writeCookie: true };
  }
  return { action: 'redirect', to: preferred === 'en' ? '/en' : '/', locale: preferred };
}
