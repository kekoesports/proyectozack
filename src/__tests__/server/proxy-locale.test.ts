/**
 * Tests de integración del proxy para el escritor de cookie de locale.
 *
 * Regla del sprint SEO+GEO 2026-07: el proxy NO redirige por locale bajo
 * ninguna circunstancia. Toda URL se sirve como se pide (200 OK). La cookie
 * `socialpro_locale` se escribe solo como memoria de preferencia — reservada
 * para un language switcher manual (Fase 4). Ver src/lib/locale-detection.ts.
 */

import { NextRequest } from 'next/server';

// next/server trae dependencias de auth en test; mock necesario para evitar init errors
jest.mock('@/lib/auth', () => ({ auth: {} }));

import { proxy } from '@/proxy';
import { LOCALE_COOKIE } from '@/lib/locale-detection';

const ORIGINAL_MAINTENANCE_MODE = process.env.MAINTENANCE_MODE;

afterEach(() => {
  if (ORIGINAL_MAINTENANCE_MODE === undefined) delete process.env.MAINTENANCE_MODE;
  else process.env.MAINTENANCE_MODE = ORIGINAL_MAINTENANCE_MODE;
});

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

// ── Nunca redirigir por locale, en ninguna combinación ────────────────────────

describe('proxy — nunca redirige por locale', () => {
  const scenarios: ReadonlyArray<{
    label: string;
    pathname: string;
    opts: { country?: string; acceptLanguage?: string; cookieLocale?: 'es' | 'en' };
  }> = [
    { label: '/ con country US',                        pathname: '/',    opts: { country: 'US' } },
    { label: '/ con Accept-Language en',                pathname: '/',    opts: { acceptLanguage: 'en-US,en;q=0.9' } },
    { label: '/ con cookie=en',                         pathname: '/',    opts: { cookieLocale: 'en' } },
    { label: '/ con cookie=en + country US',            pathname: '/',    opts: { cookieLocale: 'en', country: 'US' } },
    { label: '/en con country ES',                      pathname: '/en',  opts: { country: 'ES' } },
    { label: '/en con Accept-Language es',              pathname: '/en',  opts: { acceptLanguage: 'es-ES,es;q=0.9' } },
    { label: '/en con cookie=es',                       pathname: '/en',  opts: { cookieLocale: 'es' } },
    { label: '/en con cookie=es + country ES',          pathname: '/en',  opts: { cookieLocale: 'es', country: 'ES' } },
  ];

  it.each(scenarios)('$label → pass (no 307/308)', ({ pathname, opts }) => {
    const res = proxy(req(pathname, opts));
    expect(res?.status).not.toBe(307);
    expect(res?.status).not.toBe(308);
    expect(res?.headers.get('location') ?? '').toBe('');
  });
});

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

  it('/admin/login no recibe Set-Cookie socialpro_locale', () => {
    // /admin/login está en PUBLIC_ADMIN_PATHS → checkAdminSession retorna null → NextResponse.next()
    const res = proxy(req('/admin/login', { country: 'US' }));
    expect(res?.headers.get('set-cookie') ?? '').not.toContain(LOCALE_COOKIE);
  });
});

// ── Cookie writer solo cuando encaja con lo que el usuario está viendo ────────

describe('proxy — cookie writer', () => {
  it('/ sin cookie previa y country ES → escribe cookie=es', () => {
    const res = proxy(req('/', { country: 'ES' }));
    expect(res?.headers.get('set-cookie')).toContain(`${LOCALE_COOKIE}=es`);
  });

  it('/en sin cookie previa y country US → escribe cookie=en', () => {
    const res = proxy(req('/en', { country: 'US' }));
    expect(res?.headers.get('set-cookie')).toContain(`${LOCALE_COOKIE}=en`);
  });

  it('/ sin cookie previa y country US → NO escribe cookie (locale visto ≠ preferido)', () => {
    // No reescribimos preferencia contra lo que el usuario está mirando.
    const res = proxy(req('/', { country: 'US' }));
    expect(res?.headers.get('set-cookie') ?? '').not.toContain(LOCALE_COOKIE);
  });

  it('cookie=es ya presente → no reescribe', () => {
    const res = proxy(req('/', { country: 'ES', cookieLocale: 'es' }));
    expect(res?.headers.get('set-cookie') ?? '').not.toContain(LOCALE_COOKIE);
  });
});

// ── x-pathname header inyectado siempre (necesario para <html lang>) ──────────

describe('proxy — x-pathname header', () => {
  // El header se pasa a NextResponse.next({ request: { headers } }) para que
  // llegue al RSC del layout. No es visible en la respuesta; comprobamos que
  // el proxy no rompe ninguna ruta y que la respuesta sale limpia (200-ish).
  it.each([
    '/',
    '/en',
    '/talents',
    '/nosotros',
    '/casos',
    '/marketing-skins-cs2',
  ])('%s → proxy responde sin redirect ni error', (pathname) => {
    const res = proxy(req(pathname));
    expect(res?.status ?? 200).toBeLessThan(400);
  });
});

describe('proxy — congelación segura para el cutover', () => {
  it('bloquea HTML y API con 503 sin caché durante el mantenimiento', async () => {
    process.env.MAINTENANCE_MODE = 'true';

    const html = proxy(req('/admin/campanas'));
    const api = proxy(new NextRequest('http://localhost:3000/api/automation/deal-drafts', {
      method: 'POST',
    }));

    expect(html.status).toBe(503);
    expect(html.headers.get('cache-control')).toContain('no-store');
    expect(await html.text()).toContain('Volvemos enseguida');
    expect(api.status).toBe(503);
    await expect(api.json()).resolves.toMatchObject({ error: 'maintenance' });
  });

  it.each(['/api/health/live', '/api/health/ready'])('mantiene %s disponible', (pathname) => {
    process.env.MAINTENANCE_MODE = 'true';
    expect(proxy(req(pathname)).status).toBeLessThan(400);
  });
});
