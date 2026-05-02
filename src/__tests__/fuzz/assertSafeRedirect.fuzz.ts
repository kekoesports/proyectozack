import fc from 'fast-check';
import {
  assertSafeRedirect,
  UnsafeRedirectError,
} from '@/lib/security/assertSafeRedirect';

const ALLOWED = ['app.example.com', 'partner.example.org'];

function isSafe(url: string): boolean {
  try {
    assertSafeRedirect(url, ALLOWED);
    return true;
  } catch (e) {
    if (!(e instanceof UnsafeRedirectError)) throw e;
    return false;
  }
}

describe('assertSafeRedirect — fuzz', () => {
  it('arbitrary strings never resolve to a non-allowed host', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        try {
          const u = assertSafeRedirect(input, ALLOWED);
          expect(ALLOWED.includes(u.hostname.toLowerCase())).toBe(true);
        } catch (e) {
          expect(e).toBeInstanceOf(UnsafeRedirectError);
        }
      }),
      { numRuns: 5_000 },
    );
  });

  it('known phishing payloads always rejected', () => {
    const payloads = [
      'https://attacker.com/',
      'https://evil.com@app.example.com/',
      'https://app.example.com@attacker.com/',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'file:///etc/passwd',
      'ftp://app.example.com/',
      '//attacker.com/path',
      'https://app.example.com.attacker.com/',
      'https://attacker.com/?host=app.example.com',
      'https://APP.EXAMPLE.COM.ATTACKER.COM/',
      '\thttps://attacker.com',
      '',
      ':',
    ];
    for (const p of payloads) {
      expect(isSafe(p)).toBe(false);
    }
  });

  it('random scheme + domain + path: only allowed-host http(s) survives', () => {
    const scheme = fc.constantFrom('http', 'https', 'ftp', 'javascript', 'data', 'file');
    const domain = fc.oneof(
      fc.constant('app.example.com'),
      fc.constant('partner.example.org'),
      fc.constant('attacker.com'),
      fc.constant('app.example.com.attacker.com'),
      fc.domain(),
    );
    const path = fc.webPath();
    fc.assert(
      fc.property(scheme, domain, path, (s, d, p) => {
        const url = `${s}://${d}${p}`;
        try {
          const u = assertSafeRedirect(url, ALLOWED);
          // Si no throw: protocolo http(s) Y host en allowlist
          expect(['http:', 'https:']).toContain(u.protocol);
          expect(ALLOWED).toContain(u.hostname.toLowerCase());
        } catch (e) {
          expect(e).toBeInstanceOf(UnsafeRedirectError);
        }
      }),
      { numRuns: 2_000 },
    );
  });

  it('userinfo always rejected even with allowed final host', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 30 }), (user) => {
        const safeUser = encodeURIComponent(user);
        const url = `https://${safeUser}@app.example.com/`;
        expect(isSafe(url)).toBe(false);
      }),
      { numRuns: 500 },
    );
  });
});
