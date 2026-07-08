/**
 * Sorteos Fase 1 PR2 — saneamiento de metadata en vista admin.
 *
 * `redactAuditMetadata` es el gate PII/tokens del render. Solo claves
 * whitelisted se muestran. Claves sensibles se redactan explícitamente.
 * Strings largos se truncan. Claves ocultas se cuentan pero no se pintan.
 */

import { redactAuditMetadata, truncateIpHash, summarizeUserAgent } from '@/lib/audit/redactMetadata';

describe('redactAuditMetadata', () => {
  it('null/undefined → sin visible ni oculto', () => {
    expect(redactAuditMetadata(null)).toEqual({ visible: {}, hiddenCount: 0 });
    expect(redactAuditMetadata(undefined)).toEqual({ visible: {}, hiddenCount: 0 });
  });

  it('claves whitelisted se muestran', () => {
    const input = { giveawayId: 42, coinsEarned: 20, category: 'skin' };
    expect(redactAuditMetadata(input)).toEqual({
      visible: { giveawayId: 42, coinsEarned: 20, category: 'skin' },
      hiddenCount: 0,
    });
  });

  it('claves no whitelisted se cuentan como ocultas', () => {
    const input = { giveawayId: 1, foo: 'bar', baz: 42 };
    const r = redactAuditMetadata(input);
    expect(r.visible).toEqual({ giveawayId: 1 });
    expect(r.hiddenCount).toBe(2);
  });

  it('claves sensibles (email/token/apiKey/etc) se redactan como "[redacted]"', () => {
    const sensitiveInput = {
      giveawayId: 1,
      email: 'user@example.com',
      accessToken: 'super-secret',
      apiKey: 'ak-123',
      steamId: '765611...',
      steamTradeUrl: 'https://steamcommunity.com/tradeoffer/new/?partner=...',
      phone: '+34600000000',
      iban: 'ES12...',
      password: '...',
    };
    const r = redactAuditMetadata(sensitiveInput);
    expect(r.visible.giveawayId).toBe(1);
    for (const key of ['email', 'accessToken', 'apiKey', 'steamId', 'steamTradeUrl', 'phone', 'iban', 'password']) {
      expect(r.visible[key]).toBe('[redacted]');
    }
    expect(r.hiddenCount).toBe(0);
  });

  it('nunca expone valores concretos de email/token en visible', () => {
    const r = redactAuditMetadata({ email: 'attacker@bad.tld', authorization: 'Bearer abc.def.ghi' });
    for (const value of Object.values(r.visible)) {
      expect(String(value)).not.toContain('attacker@bad.tld');
      expect(String(value)).not.toContain('abc.def.ghi');
    }
  });

  it('strings > 200 chars se truncan', () => {
    const long = 'x'.repeat(500);
    const r = redactAuditMetadata({ reason: long });
    const value = r.visible.reason as string;
    expect(value.length).toBeLessThanOrEqual(201);
    expect(value.endsWith('…')).toBe(true);
  });

  it('arrays u otros primitivos van a { value: ... }', () => {
    expect(redactAuditMetadata('foo')).toEqual({ visible: { value: 'foo' }, hiddenCount: 0 });
    expect(redactAuditMetadata([1, 2, 3])).toEqual({ visible: { value: [1, 2, 3] }, hiddenCount: 0 });
  });
});

describe('truncateIpHash', () => {
  it('null/undefined → "—"', () => {
    expect(truncateIpHash(null)).toBe('—');
    expect(truncateIpHash(undefined)).toBe('—');
  });

  it('trunca a un máximo de 12 caracteres', () => {
    const full = 'a'.repeat(64);
    expect(truncateIpHash(full).length).toBe(12);
  });

  it('nunca devuelve el hash completo aunque venga limpio', () => {
    const hash = '9baacc48c5ee80f4552ad722c16c20fea4e785ab6fa4dc25106e067507f489f1';
    const truncated = truncateIpHash(hash);
    expect(truncated).toBe(hash.slice(0, 12));
    expect(truncated).not.toBe(hash);
  });
});

describe('summarizeUserAgent', () => {
  it('null/undefined → "—"', () => {
    expect(summarizeUserAgent(null)).toBe('—');
    expect(summarizeUserAgent(undefined)).toBe('—');
  });

  it('trunca strings largos con "…"', () => {
    const huge = 'Mozilla/5.0 ' + 'x'.repeat(500);
    const result = summarizeUserAgent(huge);
    expect(result.length).toBeLessThanOrEqual(60);
    expect(result.endsWith('…')).toBe(true);
  });

  it('extrae el primer segmento antes de "("', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const summary = summarizeUserAgent(ua);
    expect(summary.startsWith('Mozilla/5.0')).toBe(true);
    expect(summary.length).toBeLessThanOrEqual(60);
  });
});
