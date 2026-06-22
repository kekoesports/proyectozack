/**
 * Tests de integración del proxy: verifica que la detección de locale
 * se aplica SOLO a '/' y '/en', nunca a /admin ni /api.
 *
 * Importa `proxy` directamente desde src/proxy.ts.
 */

import { NextRequest } from 'next/server';

// next/server trae dependencias de auth en test; mock necesario para evitar init errors
jest.mock('@/lib/auth', () => ({ auth: {} }));

import { proxy } from '@/proxy';
import { LOCALE_COOKIE } from '@/lib/locale-detection';

function req(
  pathname: string,
  opts: {
    country?: string;
    acceptLanguage?: string;
    cookieLocale?: 'es' | 'en';
  } = {},
): NextRequest {
  const url = new URL(pathname, 'http://localhost:3000');
  const headers: Record<string, string> = {};
  if (opts.country)        headers['x-vercel-ip-country'] = opts.country;
  if (opts.acceptLanguage) headers['accept-language'] = opts.acceptLanguage;
  if (opts.cookieLocale)   headers['cookie'] = `${LOCALE_COOKIE}=${opts.cookieLocale}`;
  return new NextRequest(url, { headers });
}

// ── Aislamiento: /api y /admin nunca reciben cookie de locale ─────────────────

describe('proxy — locale isolation: /api y /admin', () => {
  it('/api/contact no recibe Set-Cookie socialpro_locale', () => {
    const res = proxy(req('/api/contact', { country: 'US' }));
    expect(res?.headers.get('set-cookie') ?? '').not.toContain(LOCALE_COOKIE);
  });

  it('/api/auth/sign-in no recibe Set-Cookie socialpro_locale', () => {
    const res = proxy(req('/api/auth/sign-in', { country: 'ES' }));
    expect(res?.headers.get('set-cookie') ?? '').not.toContain(LOCALE_COOKIE);
  });

  it('/api/contact no redirige por locale', () => {
    const res = proxy(req('/api/contact', { country: 'US' }));
    // Puede ser 429 si hay rate-limit, pero nunca un redirect de locale (307 a /en)
    expect(res?.headers.get('location') ?? '').not.toMatch(/^\/en/);
  });

  it('/admin/login no recibe Set-Cookie socialpro_locale', () => {
    // /admin/login está en PUBLIC_ADMIN_PATHS → checkAdminSession retorna null → NextResponse.next()
    const res = proxy(req('/admin/login', { country: 'US' }));
    expect(res?.headers.get('set-cookie') ?? '').not.toContain(LOCALE_COOKIE);
  });

  it('/admin/login no redirige a /en ni a /', () => {
    const res = proxy(req('/admin/login', { country: 'US' }));
    const location = res?.headers.get('location') ?? '';
    expect(location).not.toBe('/en');
    expect(location).not.toBe('/');
  });
});

// ── Homepages: locale detection correcta ─────────────────────────────────────

describe('proxy — locale detection en homepages', () => {
  it('/ con country US → 307 a /en + cookie=en', () => {
    const res = proxy(req('/', { country: 'US' }));
    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toContain('/en');
    expect(res?.headers.get('set-cookie')).toContain(`${LOCALE_COOKIE}=en`);
  });

  it('/ con country ES → pass (no redirect)', () => {
    const res = proxy(req('/', { country: 'ES' }));
    expect(res?.status).not.toBe(307);
    expect(res?.status).not.toBe(308);
  });

  it('/en con country ES → 307 a / + cookie=es', () => {
    const res = proxy(req('/en', { country: 'ES' }));
    expect(res?.status).toBe(307);
    expect(res?.headers.get('set-cookie')).toContain(`${LOCALE_COOKIE}=es`);
  });

  it('/en con country GB → pass (no redirect)', () => {
    const res = proxy(req('/en', { country: 'GB' }));
    expect(res?.status).not.toBe(307);
    expect(res?.status).not.toBe(308);
  });

  // Cookie manda sobre geo

  it('cookie=en, country ES en / → pass, sin redirect', () => {
    const res = proxy(req('/', { country: 'ES', cookieLocale: 'en' }));
    expect(res?.status).not.toBe(307);
  });

  it('cookie=es, country US en /en → pass, sin redirect', () => {
    const res = proxy(req('/en', { country: 'US', cookieLocale: 'es' }));
    expect(res?.status).not.toBe(307);
  });

  // Anti-bucle: cookie presente → no reescribe cookie

  it('anti-bucle: / cookie=es país ES → no escribe Set-Cookie', () => {
    const res = proxy(req('/', { country: 'ES', cookieLocale: 'es' }));
    expect(res?.status).not.toBe(307);
    expect(res?.headers.get('set-cookie') ?? '').not.toContain(LOCALE_COOKIE);
  });

  it('anti-bucle: /en cookie=en país GB → no escribe Set-Cookie', () => {
    const res = proxy(req('/en', { country: 'GB', cookieLocale: 'en' }));
    expect(res?.status).not.toBe(307);
    expect(res?.headers.get('set-cookie') ?? '').not.toContain(LOCALE_COOKIE);
  });
});
