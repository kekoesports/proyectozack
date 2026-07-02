/**
 * Steam OpenID helpers — tests puros.
 * Sin DB, sin red real (fetch mockeado).
 */

import {
  buildLoginUrl,
  extractCallbackParams,
  extractSteamId,
  parseIsValid,
  steamEmailPlaceholder,
  verifyOpenIdResponse,
} from '@/lib/steam/openid';

describe('[steam-openid] buildLoginUrl', () => {
  it('construye una URL con los 6 params OpenID obligatorios', () => {
    const url = buildLoginUrl(
      'https://socialpro.es/api/auth/steam/callback?state=abc',
      'https://socialpro.es',
    );

    expect(url).toMatch(/^https:\/\/steamcommunity\.com\/openid\/login\?/);
    const q = new URL(url).searchParams;
    expect(q.get('openid.ns')).toBe('http://specs.openid.net/auth/2.0');
    expect(q.get('openid.mode')).toBe('checkid_setup');
    expect(q.get('openid.identity')).toBe('http://specs.openid.net/auth/2.0/identifier_select');
    expect(q.get('openid.claimed_id')).toBe('http://specs.openid.net/auth/2.0/identifier_select');
    expect(q.get('openid.return_to')).toBe('https://socialpro.es/api/auth/steam/callback?state=abc');
    expect(q.get('openid.realm')).toBe('https://socialpro.es');
  });
});

describe('[steam-openid] extractCallbackParams', () => {
  function base(): URLSearchParams {
    const p = new URLSearchParams();
    p.set('openid.ns', 'http://specs.openid.net/auth/2.0');
    p.set('openid.mode', 'id_res');
    p.set('openid.op_endpoint', 'https://steamcommunity.com/openid/login');
    p.set('openid.claimed_id', 'https://steamcommunity.com/openid/id/76561198000000000');
    p.set('openid.identity', 'https://steamcommunity.com/openid/id/76561198000000000');
    p.set('openid.return_to', 'https://socialpro.es/api/auth/steam/callback');
    p.set('openid.response_nonce', '2026-07-02T18:00:00Znonce');
    p.set('openid.assoc_handle', '1234567890');
    p.set('openid.signed', 'signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle');
    p.set('openid.sig', 'abcdef==');
    return p;
  }

  it('devuelve todos los params cuando todos están presentes', () => {
    const out = extractCallbackParams(base());
    expect(out).not.toBeNull();
    expect(out?.['openid.mode']).toBe('id_res');
    expect(out?.['openid.claimed_id']).toBe('https://steamcommunity.com/openid/id/76561198000000000');
  });

  it('devuelve null si falta un param obligatorio (openid.sig)', () => {
    const p = base();
    p.delete('openid.sig');
    expect(extractCallbackParams(p)).toBeNull();
  });

  it('devuelve null si falta openid.mode', () => {
    const p = base();
    p.delete('openid.mode');
    expect(extractCallbackParams(p)).toBeNull();
  });
});

describe('[steam-openid] extractSteamId', () => {
  it('extrae SteamID64 válido (17 dígitos)', () => {
    expect(extractSteamId('https://steamcommunity.com/openid/id/76561198000000123')).toBe(
      '76561198000000123',
    );
  });

  it('rechaza URLs no de steamcommunity', () => {
    expect(extractSteamId('https://evil.com/openid/id/76561198000000123')).toBeNull();
  });

  it('rechaza HTTP (no HTTPS)', () => {
    expect(extractSteamId('http://steamcommunity.com/openid/id/76561198000000123')).toBeNull();
  });

  it('rechaza IDs de longitud incorrecta', () => {
    expect(extractSteamId('https://steamcommunity.com/openid/id/12345')).toBeNull();
    expect(extractSteamId('https://steamcommunity.com/openid/id/765611980000001230')).toBeNull();
  });

  it('rechaza IDs con caracteres no numéricos', () => {
    expect(extractSteamId('https://steamcommunity.com/openid/id/7656119800000abcz')).toBeNull();
  });

  it('rechaza cadenas vacías o inválidas', () => {
    expect(extractSteamId('')).toBeNull();
    expect(extractSteamId('nonsense')).toBeNull();
  });
});

describe('[steam-openid] parseIsValid', () => {
  it('devuelve true solo con is_valid:true en línea propia', () => {
    expect(parseIsValid('ns:http://specs.openid.net/auth/2.0\nis_valid:true\n')).toBe(true);
    expect(parseIsValid('is_valid:true')).toBe(true);
  });

  it('devuelve false cuando Steam responde is_valid:false', () => {
    expect(parseIsValid('ns:http://specs.openid.net/auth/2.0\nis_valid:false\n')).toBe(false);
  });

  it('devuelve false ante respuestas vacías o basura', () => {
    expect(parseIsValid('')).toBe(false);
    expect(parseIsValid('random garbage')).toBe(false);
  });

  it('no acepta "is_valid:truefake"', () => {
    expect(parseIsValid('is_valid:truefake')).toBe(false);
  });
});

describe('[steam-openid] verifyOpenIdResponse (mocked fetch)', () => {
  const params = {
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'id_res',
    'openid.op_endpoint': 'https://steamcommunity.com/openid/login',
    'openid.claimed_id': 'https://steamcommunity.com/openid/id/76561198000000000',
    'openid.identity': 'https://steamcommunity.com/openid/id/76561198000000000',
    'openid.return_to': 'https://socialpro.es/api/auth/steam/callback',
    'openid.response_nonce': '2026-07-02T18:00:00Znonce',
    'openid.assoc_handle': '1234567890',
    'openid.signed': 'signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle',
    'openid.sig': 'abcdef==',
  };

  function mockFetch(response: { ok: boolean; text?: string }): typeof fetch {
    return (async () => ({
      ok: response.ok,
      text: async () => response.text ?? '',
    })) as unknown as typeof fetch;
  }

  it('acepta cuando Steam responde is_valid:true y envía openid.mode=check_authentication', async () => {
    let sentBody = '';
    const captureFetch = (async (_url: string, init: RequestInit) => {
      sentBody = init.body as string;
      return { ok: true, text: async () => 'ns:http://specs.openid.net/auth/2.0\nis_valid:true\n' };
    }) as unknown as typeof fetch;

    await expect(verifyOpenIdResponse(params, captureFetch)).resolves.toBe(true);
    // sobrescribimos openid.mode a check_authentication al llamar a Steam
    expect(sentBody).toContain('openid.mode=check_authentication');
    // no se envía el modo original id_res
    expect(sentBody).not.toContain('openid.mode=id_res');
  });

  it('rechaza cuando Steam responde is_valid:false', async () => {
    const f = mockFetch({ ok: true, text: 'is_valid:false' });
    await expect(verifyOpenIdResponse(params, f)).resolves.toBe(false);
  });

  it('rechaza cuando el HTTP no es OK', async () => {
    const f = mockFetch({ ok: false });
    await expect(verifyOpenIdResponse(params, f)).resolves.toBe(false);
  });

  it('rechaza cuando fetch lanza (fail-closed)', async () => {
    const f = (async () => {
      throw new Error('network error');
    }) as unknown as typeof fetch;
    await expect(verifyOpenIdResponse(params, f)).resolves.toBe(false);
  });
});

describe('[steam-openid] steamEmailPlaceholder', () => {
  it('genera email placeholder estable e interno', () => {
    expect(steamEmailPlaceholder('76561198000000000')).toBe(
      'steam_76561198000000000@steam.socialpro.internal',
    );
  });
});
