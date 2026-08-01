/**
 * Tests para las funciones puras de detección de idioma.
 *
 * Actualizado 2026-07-30 (sprint SEO+GEO): `getLocaleDecision` ahora devuelve
 * SIEMPRE `action: 'pass'`. Nunca redirige por Accept-Language ni por geo-IP.
 * La cookie `socialpro_locale` se sigue escribiendo para memoria de
 * preferencia — reservada para un language switcher manual (Fase 4).
 * Ver src/lib/locale-detection.ts.
 */
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_MIDDLEWARE_MATCHER,
  SPANISH_COUNTRIES,
  detectPreferredLocale,
  getLocaleDecision,
} from '@/lib/locale-detection';

// ── Constantes ────────────────────────────────────────────────────────────────

describe('LOCALE_COOKIE', () => {
  it('tiene el nombre correcto', () => {
    expect(LOCALE_COOKIE).toBe('socialpro_locale');
  });
});

describe('LOCALE_COOKIE_MAX_AGE', () => {
  it('es de un año (31536000 segundos)', () => {
    expect(LOCALE_COOKIE_MAX_AGE).toBe(31536000);
  });
});

describe('LOCALE_MIDDLEWARE_MATCHER', () => {
  it('solo incluye / y /en', () => {
    expect(LOCALE_MIDDLEWARE_MATCHER).toEqual(['/', '/en']);
  });

  it('no incluye /admin', () => {
    expect(LOCALE_MIDDLEWARE_MATCHER as readonly string[]).not.toContain('/admin');
    expect(LOCALE_MIDDLEWARE_MATCHER as readonly string[]).not.toContain('/admin/login');
  });

  it('no incluye /api', () => {
    expect(LOCALE_MIDDLEWARE_MATCHER as readonly string[]).not.toContain('/api');
  });

  it('no incluye /_next', () => {
    expect(LOCALE_MIDDLEWARE_MATCHER as readonly string[]).not.toContain('/_next');
  });
});

// ── SPANISH_COUNTRIES ─────────────────────────────────────────────────────────

describe('SPANISH_COUNTRIES', () => {
  const es = ['ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'UY', 'PY', 'BO', 'EC',
              'VE', 'CR', 'PA', 'DO', 'GT', 'HN', 'SV', 'NI', 'CU', 'PR'];
  const en = ['US', 'GB', 'DE', 'FR', 'BR', 'PT', 'JP', 'AU', 'CA', 'IT'];

  it.each(es)('incluye %s (hispanohablante)', (country) => {
    expect(SPANISH_COUNTRIES.has(country)).toBe(true);
  });

  it.each(en)('no incluye %s (no hispanohablante)', (country) => {
    expect(SPANISH_COUNTRIES.has(country)).toBe(false);
  });
});

// ── detectPreferredLocale ─────────────────────────────────────────────────────

describe('detectPreferredLocale', () => {
  it('devuelve es para España (ES)', () => {
    expect(detectPreferredLocale('ES', null)).toBe('es');
  });

  it('devuelve es para México (MX)', () => {
    expect(detectPreferredLocale('MX', null)).toBe('es');
  });

  it('devuelve es para todos los países LATAM hispanohablantes', () => {
    const latam = ['AR', 'CO', 'CL', 'PE', 'UY', 'PY', 'BO', 'EC', 'VE', 'CR', 'PA', 'DO', 'GT', 'HN', 'SV', 'NI', 'CU', 'PR'];
    for (const c of latam) {
      expect(detectPreferredLocale(c, null)).toBe('es');
    }
  });

  it('devuelve en para US', () => {
    expect(detectPreferredLocale('US', null)).toBe('en');
  });

  it('devuelve en para GB', () => {
    expect(detectPreferredLocale('GB', null)).toBe('en');
  });

  it('devuelve en para otros países no hispanohablantes', () => {
    for (const c of ['DE', 'FR', 'IT', 'JP', 'AU', 'CA']) {
      expect(detectPreferredLocale(c, null)).toBe('en');
    }
  });

  it('sin país, accept-language es-AR → es', () => {
    expect(detectPreferredLocale(null, 'es-AR,es;q=0.9')).toBe('es');
  });

  it('sin país, accept-language es → es', () => {
    expect(detectPreferredLocale(null, 'es')).toBe('es');
  });

  it('sin país, accept-language es-MX,en;q=0.8 → es', () => {
    expect(detectPreferredLocale(undefined, 'es-MX,en;q=0.8')).toBe('es');
  });

  it('sin país, accept-language en-US → es (default fallback)', () => {
    // Sin país conocido y accept-language en-*, el default es 'es' porque el
    // mercado principal del sitio es España/LatAm.
    expect(detectPreferredLocale(null, 'en-US,en;q=0.9')).toBe('es');
  });

  it('sin país ni accept-language → es (default)', () => {
    expect(detectPreferredLocale(null, null)).toBe('es');
  });

  it('sin país ni accept-language (undefined) → es (default)', () => {
    expect(detectPreferredLocale(undefined, undefined)).toBe('es');
  });
});

// ── getLocaleDecision: SIEMPRE pass, nunca redirect ───────────────────────────

describe('getLocaleDecision — action es siempre pass', () => {
  const scenarios: ReadonlyArray<{
    label: string;
    args: {
      pathname: string;
      cookieLocale: string | undefined;
      country: string | null | undefined;
      acceptLanguage: string | null | undefined;
    };
  }> = [
    { label: '/ ES sin cookie',           args: { pathname: '/',   cookieLocale: undefined, country: 'ES', acceptLanguage: null } },
    { label: '/ MX sin cookie',           args: { pathname: '/',   cookieLocale: undefined, country: 'MX', acceptLanguage: null } },
    { label: '/ US sin cookie',           args: { pathname: '/',   cookieLocale: undefined, country: 'US', acceptLanguage: null } },
    { label: '/ GB sin cookie',           args: { pathname: '/',   cookieLocale: undefined, country: 'GB', acceptLanguage: null } },
    { label: '/ sin país AL en-US',       args: { pathname: '/',   cookieLocale: undefined, country: null, acceptLanguage: 'en-US,en;q=0.9' } },
    { label: '/ cookie=en país US',       args: { pathname: '/',   cookieLocale: 'en',      country: 'US', acceptLanguage: null } },
    { label: '/ cookie=en país ES',       args: { pathname: '/',   cookieLocale: 'en',      country: 'ES', acceptLanguage: null } },
    { label: '/en ES sin cookie',         args: { pathname: '/en', cookieLocale: undefined, country: 'ES', acceptLanguage: null } },
    { label: '/en GB sin cookie',         args: { pathname: '/en', cookieLocale: undefined, country: 'GB', acceptLanguage: null } },
    { label: '/en cookie=es país ES',     args: { pathname: '/en', cookieLocale: 'es',      country: 'ES', acceptLanguage: null } },
    { label: '/en cookie=es país US',     args: { pathname: '/en', cookieLocale: 'es',      country: 'US', acceptLanguage: null } },
  ];

  it.each(scenarios)('$label → pass', ({ args }) => {
    const d = getLocaleDecision(args);
    expect(d.action).toBe('pass');
  });

  it('locale devuelto coincide con el pathname solicitado (/ → es)', () => {
    const d = getLocaleDecision({ pathname: '/', cookieLocale: undefined, country: 'US', acceptLanguage: 'en' });
    expect(d.locale).toBe('es');
  });

  it('locale devuelto coincide con el pathname solicitado (/en → en)', () => {
    const d = getLocaleDecision({ pathname: '/en', cookieLocale: undefined, country: 'ES', acceptLanguage: 'es' });
    expect(d.locale).toBe('en');
  });
});

// ── writeCookie: solo si el usuario ve una ruta que coincide con su preferencia
// detectada y no había cookie válida previa.

describe('getLocaleDecision — writeCookie', () => {
  it('/ país ES sin cookie → writeCookie=true (es coincide con /)', () => {
    const d = getLocaleDecision({ pathname: '/', cookieLocale: undefined, country: 'ES', acceptLanguage: null });
    expect(d.writeCookie).toBe(true);
  });

  it('/en país US sin cookie → writeCookie=true (en coincide con /en)', () => {
    const d = getLocaleDecision({ pathname: '/en', cookieLocale: undefined, country: 'US', acceptLanguage: null });
    expect(d.writeCookie).toBe(true);
  });

  it('/ país US sin cookie → writeCookie=false (usuario ve ES, prefiere EN)', () => {
    // No sobrescribimos preferencia con lo que el usuario aún no ha elegido.
    const d = getLocaleDecision({ pathname: '/', cookieLocale: undefined, country: 'US', acceptLanguage: null });
    expect(d.writeCookie).toBe(false);
  });

  it('/en país ES sin cookie → writeCookie=false (usuario ve EN, prefiere ES)', () => {
    const d = getLocaleDecision({ pathname: '/en', cookieLocale: undefined, country: 'ES', acceptLanguage: null });
    expect(d.writeCookie).toBe(false);
  });

  it('cookie válida ya presente → writeCookie=false (no reescribe)', () => {
    const d = getLocaleDecision({ pathname: '/', cookieLocale: 'es', country: 'ES', acceptLanguage: null });
    expect(d.writeCookie).toBe(false);
  });

  it('cookie inválida ("fr") → tratada como ausente', () => {
    const d = getLocaleDecision({ pathname: '/', cookieLocale: 'fr', country: 'ES', acceptLanguage: null });
    expect(d.action).toBe('pass');
    expect(d.locale).toBe('es');
    expect(d.writeCookie).toBe(true); // como no había cookie válida
  });
});
