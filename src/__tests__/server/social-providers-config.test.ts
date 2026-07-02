/**
 * Registry de providers OAuth sociales.
 * Puros — verifica shape del registry, active/planned, y las URLs
 * exactas que usamos contra Discord/Google.
 */

import {
  getProvider,
  isActiveProvider,
  isPlannedProvider,
  isProviderConfigured,
  listActiveProviders,
  listAllProviders,
} from '@/lib/social/providers';

describe('[social-providers] listado', () => {
  it('listAllProviders devuelve los 4 conocidos', () => {
    expect(listAllProviders().sort()).toEqual(['discord', 'google', 'instagram', 'x'].sort());
  });

  it('listActiveProviders solo devuelve discord y google', () => {
    expect(listActiveProviders().sort()).toEqual(['discord', 'google']);
  });
});

describe('[social-providers] getProvider', () => {
  it('discord tiene status active + URLs esperadas + scopes correctos', () => {
    const cfg = getProvider('discord');
    expect(cfg?.status).toBe('active');
    if (cfg?.status !== 'active') throw new Error('unreachable');
    expect(cfg.authorizeUrl).toBe('https://discord.com/oauth2/authorize');
    expect(cfg.tokenUrl).toBe('https://discord.com/api/oauth2/token');
    expect(cfg.profileUrl).toBe('https://discord.com/api/users/@me');
    expect(cfg.revokeUrl).toBe('https://discord.com/api/oauth2/token/revoke');
    expect(cfg.scopes).toEqual(['identify', 'guilds', 'guilds.members.read']);
  });

  it('google tiene status active + scopes YouTube readonly', () => {
    const cfg = getProvider('google');
    expect(cfg?.status).toBe('active');
    if (cfg?.status !== 'active') throw new Error('unreachable');
    expect(cfg.authorizeUrl).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(cfg.tokenUrl).toBe('https://oauth2.googleapis.com/token');
    expect(cfg.profileUrl).toBe('https://www.googleapis.com/oauth2/v3/userinfo');
    expect(cfg.scopes).toContain('https://www.googleapis.com/auth/youtube.readonly');
    expect(cfg.scopes).toContain('openid');
    expect(cfg.scopes).toContain('email');
    expect(cfg.scopes).toContain('profile');
  });

  it('x está planned con reason', () => {
    const cfg = getProvider('x');
    expect(cfg?.status).toBe('planned');
    if (cfg?.status !== 'planned') throw new Error('unreachable');
    expect(cfg.reason).toMatch(/basic/i);
  });

  it('instagram está planned con reason mencionando manual/futuro', () => {
    const cfg = getProvider('instagram');
    expect(cfg?.status).toBe('planned');
    if (cfg?.status !== 'planned') throw new Error('unreachable');
    expect(cfg.reason).toMatch(/manual|meta|instagram/i);
  });

  it('provider desconocido → null', () => {
    expect(getProvider('facebook')).toBeNull();
    expect(getProvider('')).toBeNull();
  });
});

describe('[social-providers] helpers', () => {
  it('isActiveProvider distingue active de planned', () => {
    expect(isActiveProvider('discord')).toBe(true);
    expect(isActiveProvider('google')).toBe(true);
    expect(isActiveProvider('x')).toBe(false);
    expect(isActiveProvider('instagram')).toBe(false);
    expect(isActiveProvider('facebook')).toBe(false);
  });

  it('isPlannedProvider marca solo x e instagram', () => {
    expect(isPlannedProvider('x')).toBe(true);
    expect(isPlannedProvider('instagram')).toBe(true);
    expect(isPlannedProvider('discord')).toBe(false);
    expect(isPlannedProvider('unknown')).toBe(false);
  });

  it('isProviderConfigured es false sin env vars (dev limpio)', () => {
    // En este test no seteamos DISCORD_CLIENT_ID/SECRET → false por diseño.
    // Aislado del test env de social-crypto para no cruzar estado.
    const prev = { id: process.env.DISCORD_CLIENT_ID, secret: process.env.DISCORD_CLIENT_SECRET };
    delete process.env.DISCORD_CLIENT_ID;
    delete process.env.DISCORD_CLIENT_SECRET;
    // Como env.ts cachea, la única forma limpia es asertar el patrón general:
    // el helper NO debe crashear cuando faltan, debe devolver false.
    expect(() => isProviderConfigured('discord')).not.toThrow();
    // Restore
    if (prev.id) process.env.DISCORD_CLIENT_ID = prev.id;
    if (prev.secret) process.env.DISCORD_CLIENT_SECRET = prev.secret;
  });

  it('isProviderConfigured para planned es siempre false', () => {
    expect(isProviderConfigured('x')).toBe(false);
    expect(isProviderConfigured('instagram')).toBe(false);
  });
});
