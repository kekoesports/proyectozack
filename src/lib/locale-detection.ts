/**
 * Lógica pura de detección de idioma. Se usa desde el proxy para escribir la
 * cookie de preferencia. **NO redirige** por Accept-Language ni por geo-IP —
 * decisión de producto (2026-07-30, sprint SEO+GEO): la URL solicitada se
 * sirve tal cual (200 OK).
 *
 * Motivos:
 * - Google Search Central desaconseja explícitamente el auto-redirect por
 *   idioma/geo — perjudica el crawl y produce inconsistencia entre lo que
 *   ve el bot y lo que ve el usuario.
 * - Un usuario en España que quiere consultar la versión inglesa
 *   (operadores internacionales con sede en ES, por ejemplo) debe poder.
 * - Los redirects previos hacían que Googlebot con Accept-Language en-US
 *   fuera desviado a /en desde /, apartando la home ES del crawler.
 *
 * Sin dependencias de Next.js — importable en tests y en edge runtime.
 */

export const LOCALE_COOKIE = 'socialpro_locale';

export const LOCALE_COOKIE_MAX_AGE = 31536000; // 1 año

/** Rutas a las que aplica el escritor de cookie. */
export const LOCALE_MIDDLEWARE_MATCHER = ['/', '/en'] as const;

/**
 * Países hispanohablantes — usado solo para escribir la cookie de preferencia
 * si el usuario aterriza en la ruta que ya coincide con su locale probable.
 * NO se usa para redirigir.
 */
export const SPANISH_COUNTRIES: ReadonlySet<string> = new Set([
  'ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'UY', 'PY', 'BO', 'EC',
  'VE', 'CR', 'PA', 'DO', 'GT', 'HN', 'SV', 'NI', 'CU', 'PR',
]);

/**
 * Devuelve el locale preferido a partir de las señales del request.
 * Prioridad: país conocido → accept-language → default 'es'.
 * Solo se usa para etiquetar la cookie; no dispara redirect.
 */
export function detectPreferredLocale(
  country: string | null | undefined,
  acceptLanguage: string | null | undefined,
): 'es' | 'en' {
  if (country) {
    return SPANISH_COUNTRIES.has(country) ? 'es' : 'en';
  }
  if (acceptLanguage?.toLowerCase().startsWith('es')) return 'es';
  return 'es';
}

/**
 * Decisión post-redirect: `action` es SIEMPRE `'pass'`. Se conserva la forma
 * de tipo para no cambiar la firma pública en un solo hotfix, pero la rama
 * `'redirect'` está deliberadamente eliminada.
 *
 * `writeCookie` sigue siendo útil para que un futuro language switcher manual
 * (previsto en Fase 4 del sprint SEO+GEO 2026-07) pueda leer la preferencia.
 * Reservada para language switcher manual (Fase 4).
 */
export type LocaleDecision = {
  readonly action: 'pass';
  readonly locale: 'es' | 'en';
  readonly writeCookie: boolean;
};

/**
 * Devuelve solo `pass`. Nunca redirige.
 *
 * - Si la URL solicitada coincide con el locale preferido detectado, marcamos
 *   la cookie para memorizar preferencia (útil si algún día añadimos switcher).
 * - Si difiere, respetamos la URL solicitada y no reescribimos cookie
 *   (podría ser una preferencia explícita del usuario).
 */
export function getLocaleDecision(opts: {
  readonly pathname: string;
  readonly cookieLocale: string | undefined;
  readonly country: string | null | undefined;
  readonly acceptLanguage: string | null | undefined;
}): LocaleDecision {
  const { pathname, cookieLocale, country, acceptLanguage } = opts;
  const currentLocale: 'es' | 'en' = pathname === '/en' ? 'en' : 'es';

  // Escribimos cookie solo si (a) no había cookie válida, y (b) coincide con
  // el locale que el usuario aparenta preferir. Esto evita sobrescribir
  // preferencias explícitas y evita marcar cookie con la ruta que solo se
  // visitó de pasada.
  const preferred = detectPreferredLocale(country, acceptLanguage);
  const cookieAlreadyValid = cookieLocale === 'es' || cookieLocale === 'en';
  const writeCookie = !cookieAlreadyValid && currentLocale === preferred;

  return { action: 'pass', locale: currentLocale, writeCookie };
}
