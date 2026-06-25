/**
 * Tests para el sistema de geo-detección de idioma.
 * Cubre las 12 situaciones definidas en la especificación del middleware.
 *
 * Se testean funciones puras de @/lib/locale-detection (sin dependencias de Next.js).
 * El middleware (src/middleware.ts) es una capa fina sobre estas funciones.
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

  // Tests 7-9: rutas excluidas del middleware
  it('no incluye /admin (test 7)', () => {
    expect(LOCALE_MIDDLEWARE_MATCHER).not.toContain('/admin/login');
    expect(LOCALE_MIDDLEWARE_MATCHER as readonly string[]).not.toContain('/admin');
  });

  it('no incluye /api (test 8)', () => {
    expect(LOCALE_MIDDLEWARE_MATCHER as readonly string[]).not.toContain('/api');
  });

  it('no incluye /_next (test 9)', () => {
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

  // Test 4: accept-language es fuera de país conocido → ES
  it('sin país, accept-language es-AR → es (test 4)', () => {
    expect(detectPreferredLocale(null, 'es-AR,es;q=0.9')).toBe('es');
  });

  it('sin país, accept-language es → es', () => {
    expect(detectPreferredLocale(null, 'es')).toBe('es');
  });

  it('sin país, accept-language es-MX,en;q=0.8 → es', () => {
    expect(detectPreferredLocale(undefined, 'es-MX,en;q=0.8')).toBe('es');
  });

  it('sin país, accept-language en-US → es (default, no es)', () => {
    expect(detectPreferredLocale(null, 'en-US,en;q=0.9')).toBe('es');
  });

  it('sin país ni accept-language → es (default)', () => {
    expect(detectPreferredLocale(null, null)).toBe('es');
  });

  it('sin país ni accept-language (undefined) → es (default)', () => {
    expect(detectPreferredLocale(undefined, undefined)).toBe('es');
  });
});

// ── getLocaleDecision ─────────────────────────────────────────────────────────

describe('getLocaleDecision — homepages sin cookie', () => {
  // Test 1: Visitante España en / → no redirige, cookie es
  it('visitante ES en / → pass, cookie es (test 1)', () => {
    const d = getLocaleDecision({
      pathname: '/',
      cookieLocale: undefined,
      country: 'ES',
      acceptLanguage: null,
    });
    expect(d.action).toBe('pass');
    expect(d.locale).toBe('es');
    if (d.action === 'pass') expect(d.writeCookie).toBe(true);
  });

  // Test 2: Visitante LATAM en / → no redirige, cookie es
  it('visitante MX en / → pass, cookie es (test 2)', () => {
    const d = getLocaleDecision({
      pathname: '/',
      cookieLocale: undefined,
      country: 'MX',
      acceptLanguage: null,
    });
    expect(d.action).toBe('pass');
    expect(d.locale).toBe('es');
    if (d.action === 'pass') expect(d.writeCookie).toBe(true);
  });

  // Test 3: Visitante US/GB en / → redirige a /en, cookie en
  it('visitante US en / → redirect /en, cookie en (test 3)', () => {
    const d = getLocaleDecision({
      pathname: '/',
      cookieLocale: undefined,
      country: 'US',
      acceptLanguage: null,
    });
    expect(d.action).toBe('redirect');
    expect(d.locale).toBe('en');
    if (d.action === 'redirect') expect(d.to).toBe('/en');
  });

  it('visitante GB en / → redirect /en, cookie en (test 3)', () => {
    const d = getLocaleDecision({
      pathname: '/',
      cookieLocale: undefined,
      country: 'GB',
      acceptLanguage: null,
    });
    expect(d.action).toBe('redirect');
    if (d.action === 'redirect') expect(d.to).toBe('/en');
  });

  // Test 4: Sin país, accept-language es-AR → no redirige
  it('sin país, accept-language es-AR en / → pass, cookie es (test 4)', () => {
    const d = getLocaleDecision({
      pathname: '/',
      cookieLocale: undefined,
      country: null,
      acceptLanguage: 'es-AR,es;q=0.9',
    });
    expect(d.action).toBe('pass');
    expect(d.locale).toBe('es');
  });

  // Test 10: /en con country GB → no redirige, ya está bien
  it('/en con country GB → pass, cookie en (test 10)', () => {
    const d = getLocaleDecision({
      pathname: '/en',
      cookieLocale: undefined,
      country: 'GB',
      acceptLanguage: null,
    });
    expect(d.action).toBe('pass');
    expect(d.locale).toBe('en');
    if (d.action === 'pass') expect(d.writeCookie).toBe(true);
  });

  // Test 11: /en con country ES sin cookie → redirige a /
  it('/en con country ES sin cookie → redirect /, cookie es (test 11)', () => {
    const d = getLocaleDecision({
      pathname: '/en',
      cookieLocale: undefined,
      country: 'ES',
      acceptLanguage: null,
    });
    expect(d.action).toBe('redirect');
    expect(d.locale).toBe('es');
    if (d.action === 'redirect') expect(d.to).toBe('/');
  });
});

describe('getLocaleDecision — cookie presente', () => {
  // Test 5: país hispanohablante → geo gana sobre cookie (corrección silenciosa)
  // Para países ES/LATAM el sistema garantiza siempre contenido en español,
  // incluso si hay una cookie 'en' (puede ser caducada o accidental).
  // Cookie gana solo para países NO hispanohablantes (ver tests 6 y anti-bucle).
  it('cookie=en, country ES en / → pass, geo gana, corrige cookie a es (test 5)', () => {
    const d = getLocaleDecision({
      pathname: '/',
      cookieLocale: 'en',
      country: 'ES',
      acceptLanguage: null,
    });
    expect(d.action).toBe('pass');
    expect(d.locale).toBe('es');
    if (d.action === 'pass') expect(d.writeCookie).toBe(true);
  });

  // Test 6: Cookie manual es, country US en /en → no redirige (respeta cookie)
  it('cookie=es, country US en /en → pass sin cookie write (test 6)', () => {
    const d = getLocaleDecision({
      pathname: '/en',
      cookieLocale: 'es',
      country: 'US',
      acceptLanguage: null,
    });
    expect(d.action).toBe('pass');
    expect(d.locale).toBe('es');
    if (d.action === 'pass') expect(d.writeCookie).toBe(false);
  });

  it('cookie=es, country ES en / → pass sin redirect', () => {
    const d = getLocaleDecision({
      pathname: '/',
      cookieLocale: 'es',
      country: 'ES',
      acceptLanguage: null,
    });
    expect(d.action).toBe('pass');
    if (d.action === 'pass') expect(d.writeCookie).toBe(false);
  });
});

describe('getLocaleDecision — anti-bucle (test 12)', () => {
  // Simula el flujo completo: US llega a /, middleware redirige a /en + escribe cookie.
  // La siguiente request a /en tiene cookie=en → debe pasar sin redirigir.
  it('después de redirect / → /en con cookie=en, no vuelve a redirigir', () => {
    // Primera request: US sin cookie en /
    const first = getLocaleDecision({
      pathname: '/',
      cookieLocale: undefined,
      country: 'US',
      acceptLanguage: null,
    });
    expect(first.action).toBe('redirect');
    if (first.action === 'redirect') expect(first.to).toBe('/en');

    // Segunda request: /en con cookie=en (escrita por el redirect)
    const second = getLocaleDecision({
      pathname: '/en',
      cookieLocale: first.locale, // 'en'
      country: 'US',
      acceptLanguage: null,
    });
    expect(second.action).toBe('pass');
    if (second.action === 'pass') expect(second.writeCookie).toBe(false);
  });

  it('después de redirect /en → / con cookie=es, no vuelve a redirigir', () => {
    // Primera request: ES sin cookie en /en
    const first = getLocaleDecision({
      pathname: '/en',
      cookieLocale: undefined,
      country: 'ES',
      acceptLanguage: null,
    });
    expect(first.action).toBe('redirect');
    if (first.action === 'redirect') expect(first.to).toBe('/');

    // Segunda request: / con cookie=es
    const second = getLocaleDecision({
      pathname: '/',
      cookieLocale: first.locale, // 'es'
      country: 'ES',
      acceptLanguage: null,
    });
    expect(second.action).toBe('pass');
    if (second.action === 'pass') expect(second.writeCookie).toBe(false);
  });

  it('cookie inválida (valor inesperado) no bloquea la detección', () => {
    // Si la cookie tiene un valor no reconocido, cae a detección normal
    const d = getLocaleDecision({
      pathname: '/',
      cookieLocale: 'fr', // valor no válido
      country: 'US',
      acceptLanguage: null,
    });
    // 'fr' no es 'es' ni 'en', así que sigue la detección → US → redirect /en
    expect(d.action).toBe('redirect');
    expect(d.locale).toBe('en');
  });
});
