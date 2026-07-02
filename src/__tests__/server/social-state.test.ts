/**
 * State cookie signed HMAC — anti-CSRF de OAuth.
 * Tests puros. Necesita BETTER_AUTH_SECRET para firmar.
 */
process.env.BETTER_AUTH_SECRET = 'a'.repeat(64); // 32+ chars required by env.ts

import {
  STATE_TTL_MS,
  generateState,
  signState,
  verifyState,
} from '@/lib/social/state';

describe('[social-state] generateState', () => {
  it('devuelve base64url de 32 bytes → 43 chars', () => {
    const s = generateState();
    expect(s).toHaveLength(43);
    expect(s).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('genera valores distintos en cada llamada', () => {
    const set = new Set<string>();
    for (let i = 0; i < 50; i++) set.add(generateState());
    expect(set.size).toBe(50);
  });
});

describe('[social-state] signState/verifyState round-trip', () => {
  it('cookie válido → payload decodificado', () => {
    const cookie = signState({ state: 'abc', provider: 'discord', ts: Date.now() });
    const out = verifyState(cookie, 'discord');
    expect(out?.state).toBe('abc');
    expect(out?.provider).toBe('discord');
  });
});

describe('[social-state] verifyState rechaza cookies inválidos', () => {
  it('signature manipulada → null', () => {
    const cookie = signState({ state: 'abc', provider: 'discord', ts: Date.now() });
    const [body, sig] = cookie.split('.');
    const bad = `${body}.${(sig ?? '').slice(0, -1)}Z`;
    expect(verifyState(bad, 'discord')).toBeNull();
  });

  it('provider distinto → null', () => {
    const cookie = signState({ state: 'abc', provider: 'discord', ts: Date.now() });
    expect(verifyState(cookie, 'google')).toBeNull();
  });

  it('ts > 10 min → null', () => {
    const stale = signState({ state: 'abc', provider: 'discord', ts: Date.now() - STATE_TTL_MS - 1000 });
    expect(verifyState(stale, 'discord')).toBeNull();
  });

  it('ts futuro (clock skew grande) → null', () => {
    const future = signState({ state: 'abc', provider: 'discord', ts: Date.now() + 5 * 60_000 });
    expect(verifyState(future, 'discord')).toBeNull();
  });

  it('cookie ausente → null', () => {
    expect(verifyState(undefined, 'discord')).toBeNull();
  });

  it('cookie sin separador . → null', () => {
    expect(verifyState('sinseparador', 'discord')).toBeNull();
  });

  it('body no es JSON válido → null', () => {
    const fake = Buffer.from('no-json', 'utf8').toString('base64url');
    // No podemos firmar sin la key; usamos signState con un body correcto y luego mutamos.
    const goodCookie = signState({ state: 'abc', provider: 'discord', ts: Date.now() });
    const [, sig] = goodCookie.split('.');
    const bad = `${fake}.${sig}`;
    expect(verifyState(bad, 'discord')).toBeNull();
  });
});
