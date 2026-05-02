/**
 * Tests para `redactPII`. El env mock debe estar antes del import de `lib/log`
 * — el módulo construye el Map invertido al cargar, así que los valores mock
 * son los que se buscarán para redacción.
 *
 * Excepción al cleanup global de mocks: el Proxy de `jest.setup.ts` no implementa
 * `ownKeys`, por lo que `Object.entries(env)` retorna `[]` y el redactor no puede
 * enumerar valores. Mantenemos el mock literal aquí.
 */
jest.mock('@/lib/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:secret@db.local/proj',
    RESEND_API_KEY: 're_test_SUPER_SECRET_TOKEN_12345',
    BETTER_AUTH_SECRET: 'auth-secret-xxxxxxxxxxxxxxxxxxx',
    NEXT_PUBLIC_SITE_URL: 'https://example.test',
  },
}));

import { redactPII, logRedacted } from '@/lib/log';

describe('redactPII', () => {
  it('redacts plain email', () => {
    expect(redactPII('contact me at alice@example.com please')).toBe(
      'contact me at [REDACTED_EMAIL] please',
    );
  });

  it('redacts multiple emails in one string', () => {
    const r = redactPII('a@b.com and c@d.org') as string;
    expect(r).not.toContain('@b.com');
    expect(r).not.toContain('@d.org');
    expect(r.match(/\[REDACTED_EMAIL\]/g)?.length).toBe(2);
  });

  it('redacts JWT', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcDEF-_123';
    expect(redactPII(`token=${jwt}`)).toBe('token=[REDACTED_JWT]');
  });

  it('redacts PAN passing Luhn (4111 1111 1111 1111 = visa test)', () => {
    expect(redactPII('card 4111111111111111 charged')).toBe('card [REDACTED_PAN] charged');
  });

  it('does NOT redact 16-digit number that fails Luhn', () => {
    expect(redactPII('order 1234567890123456')).toBe('order 1234567890123456');
  });

  it('redacts E.164 international phone', () => {
    expect(redactPII('call +34666123456 now')).toBe('call [REDACTED_PHONE] now');
  });

  it('redacts ES local phone (9 digits starting 6/7/8/9)', () => {
    expect(redactPII('mi tel es 666123456')).toBe('mi tel es [REDACTED_PHONE]');
  });

  it('does NOT redact short numeric IDs (e.g. order id 12345)', () => {
    expect(redactPII('order 12345')).toBe('order 12345');
  });

  it('does NOT redact UUIDs (public IDs in this repo)', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(redactPII(`talent ${uuid} updated`)).toBe(`talent ${uuid} updated`);
  });

  it('redacts env value (exact substring) → [REDACTED_ENV:KEY]', () => {
    const r = redactPII('boot db=postgresql://test:secret@db.local/proj ok') as string;
    expect(r).toContain('[REDACTED_ENV:DATABASE_URL]');
    expect(r).not.toContain('test:secret');
  });

  it('redacts BETTER_AUTH_SECRET when leaked', () => {
    const r = redactPII('header X-Secret: auth-secret-xxxxxxxxxxxxxxxxxxx in log') as string;
    expect(r).toContain('[REDACTED_ENV:BETTER_AUTH_SECRET]');
  });

  it('walks nested objects and arrays', () => {
    const input = {
      user: { email: 'x@y.com', name: 'Alice' },
      tokens: ['eyJabc.eyJdef.ghi', 'safe-id'],
    };
    const out = redactPII(input) as { user: { email: string; name: string }; tokens: string[] };
    expect(out.user.email).toBe('[REDACTED_EMAIL]');
    expect(out.user.name).toBe('Alice');
    expect(out.tokens[0]).toBe('[REDACTED_JWT]');
    expect(out.tokens[1]).toBe('safe-id');
  });

  it('handles circular references without hanging', () => {
    type Node = { name: string; child?: Node };
    const a: Node = { name: 'parent' };
    a.child = a;
    const out = redactPII(a) as { name: string; child: unknown };
    expect(out.name).toBe('parent');
    expect(out.child).toBe('[Circular]');
  });

  it('returns primitives unchanged', () => {
    expect(redactPII(null)).toBeNull();
    expect(redactPII(undefined)).toBeUndefined();
    expect(redactPII(42)).toBe(42);
    expect(redactPII(true)).toBe(true);
  });

  it('redacts inside Error: message and stack', () => {
    const e = new Error('failed for alice@example.com');
    const out = redactPII(e) as { name: string; message: string };
    expect(out.name).toBe('Error');
    expect(out.message).toBe('failed for [REDACTED_EMAIL]');
  });

  it('Error without stack: stack field is undefined (no crash)', () => {
    const e = new Error('boom for x@y.com');
    Object.defineProperty(e, 'stack', { value: undefined });
    const out = redactPII(e) as { stack: unknown; message: string };
    expect(out.stack).toBeUndefined();
    expect(out.message).toBe('boom for [REDACTED_EMAIL]');
  });

  it('logRedacted: redacts message and args before console call', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      logRedacted('warn', 'failure for alice@example.com', { token: 'eyJa.eyJb.sig' });
      expect(spy).toHaveBeenCalledTimes(1);
      const [msg, args] = spy.mock.calls[0]!;
      expect(msg).toBe('failure for [REDACTED_EMAIL]');
      expect(args).toEqual({ token: '[REDACTED_JWT]' });
    } finally {
      spy.mockRestore();
    }
  });

  it('mixes email + JWT + env in one string', () => {
    const input =
      'failure for alice@x.com using token eyJh.eyJp.sig db=postgresql://test:secret@db.local/proj';
    const r = redactPII(input) as string;
    expect(r).toContain('[REDACTED_EMAIL]');
    expect(r).toContain('[REDACTED_JWT]');
    expect(r).toContain('[REDACTED_ENV:DATABASE_URL]');
    expect(r).not.toContain('alice@x.com');
    expect(r).not.toContain('eyJh.eyJp.sig');
    expect(r).not.toContain('test:secret');
  });
});
