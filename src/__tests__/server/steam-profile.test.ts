/**
 * fetchSteamProfile — degradación con y sin STEAM_API_KEY.
 * Verifica también que la API key NUNCA aparece en el objeto devuelto ni
 * escape en errores capturados.
 */

import { fetchSteamProfile, FALLBACK_PROFILE } from '@/lib/steam/profile';

describe('[steam-profile] fetchSteamProfile', () => {
  const SID = '76561198000000000';

  it('devuelve FALLBACK cuando no hay STEAM_API_KEY (undefined)', async () => {
    const notCalledFetch = (async () => {
      throw new Error('fetch should not be called without api key');
    }) as unknown as typeof fetch;
    await expect(fetchSteamProfile(SID, undefined, notCalledFetch)).resolves.toEqual(FALLBACK_PROFILE);
  });

  it('devuelve FALLBACK cuando la API key es cadena vacía', async () => {
    const notCalledFetch = (async () => {
      throw new Error('fetch should not be called with empty api key');
    }) as unknown as typeof fetch;
    await expect(fetchSteamProfile(SID, '', notCalledFetch)).resolves.toEqual(FALLBACK_PROFILE);
  });

  it('devuelve perfil real cuando Steam responde OK', async () => {
    const f = (async () => ({
      ok: true,
      json: async () => ({
        response: {
          players: [{ personaname: 'kekO', avatarfull: 'https://avatars.steamstatic.com/abc.jpg' }],
        },
      }),
    })) as unknown as typeof fetch;

    const p = await fetchSteamProfile(SID, 'fake-key', f);
    expect(p.personaName).toBe('kekO');
    expect(p.avatarUrl).toBe('https://avatars.steamstatic.com/abc.jpg');
  });

  it('rechaza avatar de dominio raro', async () => {
    const f = (async () => ({
      ok: true,
      json: async () => ({
        response: {
          players: [{ personaname: 'kekO', avatarfull: 'javascript:alert(1)' }],
        },
      }),
    })) as unknown as typeof fetch;

    const p = await fetchSteamProfile(SID, 'fake-key', f);
    expect(p.personaName).toBe('kekO');
    expect(p.avatarUrl).toBeNull();
  });

  it('truncar personaname a 100 chars', async () => {
    const longName = 'A'.repeat(200);
    const f = (async () => ({
      ok: true,
      json: async () => ({ response: { players: [{ personaname: longName, avatarfull: null }] } }),
    })) as unknown as typeof fetch;

    const p = await fetchSteamProfile(SID, 'fake-key', f);
    expect(p.personaName.length).toBe(100);
  });

  it('devuelve FALLBACK si Steam responde sin players', async () => {
    const f = (async () => ({
      ok: true,
      json: async () => ({ response: { players: [] } }),
    })) as unknown as typeof fetch;

    await expect(fetchSteamProfile(SID, 'fake-key', f)).resolves.toEqual(FALLBACK_PROFILE);
  });

  it('devuelve FALLBACK si Steam responde HTTP no OK', async () => {
    const f = (async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch;
    await expect(fetchSteamProfile(SID, 'fake-key', f)).resolves.toEqual(FALLBACK_PROFILE);
  });

  it('devuelve FALLBACK si fetch lanza', async () => {
    const f = (async () => {
      throw new Error('network');
    }) as unknown as typeof fetch;
    await expect(fetchSteamProfile(SID, 'fake-key', f)).resolves.toEqual(FALLBACK_PROFILE);
  });

  it('NUNCA incluye la API key en el objeto devuelto', async () => {
    const APIKEY = 'test-secret-12345';
    const f = (async () => ({
      ok: true,
      json: async () => ({ response: { players: [{ personaname: 'x', avatarfull: null }] } }),
    })) as unknown as typeof fetch;

    const p = await fetchSteamProfile(SID, APIKEY, f);
    const serialized = JSON.stringify(p);
    expect(serialized).not.toContain(APIKEY);
  });
});
