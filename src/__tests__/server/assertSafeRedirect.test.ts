import {
  assertSafeRedirect,
  UnsafeRedirectError,
} from '@/lib/security/assertSafeRedirect';

const ALLOWED = ['app.example.com', 'partner.example.org'];

describe('assertSafeRedirect', () => {
  it('returns URL for allowed host (https)', () => {
    const r = assertSafeRedirect('https://app.example.com/path?x=1', ALLOWED);
    expect(r.hostname).toBe('app.example.com');
  });

  it('returns URL for allowed host (http)', () => {
    const r = assertSafeRedirect('http://app.example.com/', ALLOWED);
    expect(r.protocol).toBe('http:');
  });

  it('throws on host not in allowlist', () => {
    expect(() => assertSafeRedirect('https://attacker.com/', ALLOWED)).toThrow(UnsafeRedirectError);
  });

  it('throws on userinfo embed (https://attacker.com@trusted.com)', () => {
    expect(() =>
      assertSafeRedirect('https://attacker.com@app.example.com/', ALLOWED),
    ).toThrow(/userinfo/);
  });

  it('throws on javascript: scheme', () => {
    expect(() => assertSafeRedirect('javascript:alert(1)', ALLOWED)).toThrow(/protocol|invalid/);
  });

  it('throws on data: scheme', () => {
    expect(() => assertSafeRedirect('data:text/html,<script>alert(1)</script>', ALLOWED)).toThrow(
      /protocol|invalid/,
    );
  });

  it('throws on file: scheme', () => {
    expect(() => assertSafeRedirect('file:///etc/passwd', ALLOWED)).toThrow();
  });

  it('throws on relative URL (URL constructor rejects)', () => {
    expect(() => assertSafeRedirect('/dashboard', ALLOWED)).toThrow(/invalid_url/);
  });

  it('throws on malformed URL', () => {
    expect(() => assertSafeRedirect('not-a-url', ALLOWED)).toThrow(/invalid_url/);
  });

  it('throws on empty string', () => {
    expect(() => assertSafeRedirect('', ALLOWED)).toThrow(/invalid_url/);
  });

  it('rejects host masquerading via subdomain (localhost.evil.com)', () => {
    expect(() => assertSafeRedirect('https://localhost.evil.com/', ALLOWED)).toThrow();
  });

  it('rejects fake-allowed via prefix (app.example.com.evil.com)', () => {
    expect(() => assertSafeRedirect('https://app.example.com.evil.com/', ALLOWED)).toThrow();
  });

  it('case-insensitive host comparison', () => {
    const r = assertSafeRedirect('https://APP.EXAMPLE.COM/', ALLOWED);
    expect(r.hostname).toBe('app.example.com');
  });

  it('accepts non-standard port for allowed host', () => {
    const r = assertSafeRedirect('https://app.example.com:9443/foo', ALLOWED);
    expect(r.port).toBe('9443');
  });

  it('accepts encoded characters in path/query (does not affect host check)', () => {
    const r = assertSafeRedirect('https://app.example.com/foo%20bar?x=%26', ALLOWED);
    expect(r.hostname).toBe('app.example.com');
  });

  it('localhost: rejected by default', () => {
    expect(() =>
      assertSafeRedirect('http://localhost:3000/', ALLOWED, { allowLocalhost: false }),
    ).toThrow(/localhost/);
  });

  it('localhost default (no opts) under NODE_ENV=test → rejected', () => {
    expect(() => assertSafeRedirect('http://localhost:3000/', ALLOWED)).toThrow(/localhost/);
  });

  it('localhost: accepted when allowLocalhost=true', () => {
    const r = assertSafeRedirect('http://localhost:3000/', ALLOWED, { allowLocalhost: true });
    expect(r.hostname).toBe('localhost');
  });

  it('localhost variants (127.0.0.1, [::1]) treated as localhost', () => {
    const r1 = assertSafeRedirect('http://127.0.0.1:3000/', ALLOWED, { allowLocalhost: true });
    expect(r1.hostname).toBe('127.0.0.1');
    const r2 = assertSafeRedirect('http://[::1]:3000/', ALLOWED, { allowLocalhost: true });
    // IPv6 hostname comes wrapped in brackets via `URL` API
    expect(r2.hostname.includes('::1')).toBe(true);
  });

  it('IP literal in allowlist works', () => {
    const r = assertSafeRedirect('https://10.0.0.5/api', ['10.0.0.5']);
    expect(r.hostname).toBe('10.0.0.5');
  });

  it('UnsafeRedirectError has expected name', () => {
    try {
      assertSafeRedirect('javascript:1', ALLOWED);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(UnsafeRedirectError);
      if (e instanceof UnsafeRedirectError) expect(e.name).toBe('UnsafeRedirectError');
    }
  });
});
