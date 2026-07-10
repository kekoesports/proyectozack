/**
 * Sanitización del `returnTo` que preserva el sitio de origen tras un
 * login Steam OpenID. La regla clave: cualquier duda → fallback a
 * `/sorteos` (nunca open redirect, nunca fuera de /sorteos).
 */

import {
  sanitizeReturnTo,
  SAFE_RETURN_FALLBACK,
} from '@/lib/steam/return-to';

describe('sanitizeReturnTo — aceptaciones válidas', () => {
  it('acepta /sorteos exacto', () => {
    expect(sanitizeReturnTo('/sorteos')).toBe('/sorteos');
  });

  it('acepta /sorteos/zacketizor', () => {
    expect(sanitizeReturnTo('/sorteos/zacketizor')).toBe('/sorteos/zacketizor');
  });

  it('acepta /sorteos/perfil', () => {
    expect(sanitizeReturnTo('/sorteos/perfil')).toBe('/sorteos/perfil');
  });

  it('acepta /sorteos/perfil/permisos', () => {
    expect(sanitizeReturnTo('/sorteos/perfil/permisos')).toBe('/sorteos/perfil/permisos');
  });

  it('preserva query params', () => {
    expect(sanitizeReturnTo('/sorteos/zacketizor?tab=recompensas')).toBe(
      '/sorteos/zacketizor?tab=recompensas',
    );
  });

  it('preserva múltiples query params', () => {
    expect(sanitizeReturnTo('/sorteos/perfil?section=inventario&sort=fecha')).toBe(
      '/sorteos/perfil?section=inventario&sort=fecha',
    );
  });

  it('acepta /sorteos?query directamente sobre root', () => {
    expect(sanitizeReturnTo('/sorteos?ref=nav')).toBe('/sorteos?ref=nav');
  });

  it('acepta rutas legales bajo /sorteos', () => {
    expect(sanitizeReturnTo('/sorteos/faq')).toBe('/sorteos/faq');
    expect(sanitizeReturnTo('/sorteos/terminos')).toBe('/sorteos/terminos');
    expect(sanitizeReturnTo('/sorteos/participacion-responsable')).toBe(
      '/sorteos/participacion-responsable',
    );
  });

  it('trimea espacios alrededor pero no dentro del path', () => {
    expect(sanitizeReturnTo('  /sorteos/zacketizor  ')).toBe('/sorteos/zacketizor');
  });

  it('descarta el hash aunque llegue (limitación documentada)', () => {
    // El navegador nunca envía el hash al server, pero si alguien lo
    // metiera manualmente en el query lo descartamos.
    expect(sanitizeReturnTo('/sorteos/zacketizor#misiones')).toBe('/sorteos/zacketizor');
  });
});

describe('sanitizeReturnTo — rechazos por open redirect', () => {
  it('rechaza https://evil.com absoluto', () => {
    expect(sanitizeReturnTo('https://evil.com/sorteos')).toBe(SAFE_RETURN_FALLBACK);
  });

  it('rechaza http://evil.com', () => {
    expect(sanitizeReturnTo('http://evil.com')).toBe(SAFE_RETURN_FALLBACK);
  });

  it('rechaza //evil.com (protocol-relative)', () => {
    expect(sanitizeReturnTo('//evil.com')).toBe(SAFE_RETURN_FALLBACK);
  });

  it('rechaza //evil.com/sorteos (protocol-relative con path que parece válido)', () => {
    expect(sanitizeReturnTo('//evil.com/sorteos')).toBe(SAFE_RETURN_FALLBACK);
  });

  it('rechaza backslash trick /\\evil.com', () => {
    expect(sanitizeReturnTo('/\\evil.com')).toBe(SAFE_RETURN_FALLBACK);
  });

  it('rechaza backslash embebido /sorteos\\..\\admin', () => {
    expect(sanitizeReturnTo('/sorteos\\..\\admin')).toBe(SAFE_RETURN_FALLBACK);
  });

  it('rechaza javascript: pseudo-URL', () => {
    expect(sanitizeReturnTo('javascript:alert(1)')).toBe(SAFE_RETURN_FALLBACK);
  });

  it('rechaza data: URI', () => {
    expect(sanitizeReturnTo('data:text/html,<script>alert(1)</script>')).toBe(SAFE_RETURN_FALLBACK);
  });
});

describe('sanitizeReturnTo — rechazos por scope fuera de /sorteos', () => {
  it('rechaza /admin', () => {
    expect(sanitizeReturnTo('/admin')).toBe(SAFE_RETURN_FALLBACK);
  });

  it('rechaza /admin/giveaways', () => {
    expect(sanitizeReturnTo('/admin/giveaways')).toBe(SAFE_RETURN_FALLBACK);
  });

  it('rechaza /api/auth/steam/login', () => {
    expect(sanitizeReturnTo('/api/auth/steam/login')).toBe(SAFE_RETURN_FALLBACK);
  });

  it('rechaza /marcas', () => {
    expect(sanitizeReturnTo('/marcas')).toBe(SAFE_RETURN_FALLBACK);
  });

  it('rechaza / (home)', () => {
    expect(sanitizeReturnTo('/')).toBe(SAFE_RETURN_FALLBACK);
  });

  it('rechaza /sorteosXYZ (prefijo pero no path /sorteos/...)', () => {
    expect(sanitizeReturnTo('/sorteosXYZ')).toBe(SAFE_RETURN_FALLBACK);
  });

  it('rechaza /sorteos-otro', () => {
    expect(sanitizeReturnTo('/sorteos-otro')).toBe(SAFE_RETURN_FALLBACK);
  });
});

describe('sanitizeReturnTo — rechazos por input inválido', () => {
  it('rechaza null', () => {
    expect(sanitizeReturnTo(null)).toBe(SAFE_RETURN_FALLBACK);
  });

  it('rechaza undefined', () => {
    expect(sanitizeReturnTo(undefined)).toBe(SAFE_RETURN_FALLBACK);
  });

  it('rechaza string vacío', () => {
    expect(sanitizeReturnTo('')).toBe(SAFE_RETURN_FALLBACK);
  });

  it('rechaza sólo espacios', () => {
    expect(sanitizeReturnTo('   ')).toBe(SAFE_RETURN_FALLBACK);
  });

  it('rechaza path relativo sin slash inicial', () => {
    expect(sanitizeReturnTo('sorteos/zacketizor')).toBe(SAFE_RETURN_FALLBACK);
  });

  it('rechaza tipos no-string', () => {
    // @ts-expect-error -- input inválido intencionado para el test
    expect(sanitizeReturnTo(42)).toBe(SAFE_RETURN_FALLBACK);
    // @ts-expect-error -- input inválido intencionado para el test
    expect(sanitizeReturnTo({ path: '/sorteos' })).toBe(SAFE_RETURN_FALLBACK);
  });
});

describe('sanitizeReturnTo — idempotencia y sanidad', () => {
  it('sanitizar dos veces da el mismo resultado', () => {
    const once = sanitizeReturnTo('/sorteos/zacketizor?tab=misiones');
    const twice = sanitizeReturnTo(once);
    expect(twice).toBe(once);
  });

  it('sanitizar el fallback devuelve el fallback', () => {
    expect(sanitizeReturnTo(SAFE_RETURN_FALLBACK)).toBe(SAFE_RETURN_FALLBACK);
  });

  it('el fallback es exactamente /sorteos', () => {
    expect(SAFE_RETURN_FALLBACK).toBe('/sorteos');
  });
});
