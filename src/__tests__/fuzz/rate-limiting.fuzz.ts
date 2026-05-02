import { NextRequest, NextResponse } from 'next/server';

/* -------------------------------------------------------------------------- */
/*  Rate limiting fuzz tests                                                  */
/*  Tests the proxy rate limiter against burst attacks and IP spoofing         */
/* -------------------------------------------------------------------------- */

// We need to import the proxy directly and test its behavior
// The proxy is at src/proxy.ts — we import the function
jest.mock('@/lib/auth', () => ({ auth: {} }));

// Import proxy — it exports { proxy, config }
import { proxy } from '@/proxy';

function makeMiddlewareRequest(
  pathname: string,
  ip = '1.2.3.4',
): NextRequest {
  const url = new URL(pathname, 'http://localhost:3000');
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      'x-forwarded-for': ip,
      'Content-Type': 'application/json',
    },
  });
}

describe('rate limiting — burst protection', () => {
  // Clear the in-memory store between test suites by using unique IPs
  let ipCounter = 0;
  function uniqueIp() {
    ipCounter++;
    return `10.0.${Math.floor(ipCounter / 256)}.${ipCounter % 256}`;
  }

  it('/api/contact: blocks after 5 requests per minute', async () => {
    const ip = uniqueIp();
    const results: (NextResponse | undefined)[] = [];

    for (let i = 0; i < 8; i++) {
      const req = makeMiddlewareRequest('/api/contact', ip);
      const res = proxy(req);
      results.push(res);
    }

    // First 5 should pass (return NextResponse.next() — no status override)
    for (let i = 0; i < 5; i++) {
      const res = results[i];
      // NextResponse.next() returns 200 status
      expect(res?.status).not.toBe(429);
    }

    // 6th, 7th, 8th should be rate-limited
    for (let i = 5; i < 8; i++) {
      const res = results[i];
      expect(res?.status).toBe(429);
    }
  });

  it('/api/creator-apply: blocks after 3 requests per minute', async () => {
    const ip = uniqueIp();
    const results: (NextResponse | undefined)[] = [];

    for (let i = 0; i < 6; i++) {
      const req = makeMiddlewareRequest('/api/creator-apply', ip);
      const res = proxy(req);
      results.push(res);
    }

    for (let i = 0; i < 3; i++) {
      expect(results[i]?.status).not.toBe(429);
    }
    for (let i = 3; i < 6; i++) {
      expect(results[i]?.status).toBe(429);
    }
  });

  it('/api/auth/sign-in: blocks after 10 requests per 15min', async () => {
    const ip = uniqueIp();
    const results: (NextResponse | undefined)[] = [];

    for (let i = 0; i < 13; i++) {
      const req = makeMiddlewareRequest('/api/auth/sign-in', ip);
      const res = proxy(req);
      results.push(res);
    }

    for (let i = 0; i < 10; i++) {
      expect(results[i]?.status).not.toBe(429);
    }
    for (let i = 10; i < 13; i++) {
      expect(results[i]?.status).toBe(429);
    }
  });

  it('/api/auth/sign-up: blocks after 5 requests per hour', async () => {
    const ip = uniqueIp();
    const results: (NextResponse | undefined)[] = [];

    for (let i = 0; i < 8; i++) {
      const req = makeMiddlewareRequest('/api/auth/sign-up', ip);
      const res = proxy(req);
      results.push(res);
    }

    for (let i = 0; i < 5; i++) {
      expect(results[i]?.status).not.toBe(429);
    }
    for (let i = 5; i < 8; i++) {
      expect(results[i]?.status).toBe(429);
    }
  });

  it('different IPs have independent rate limits', async () => {
    const ip1 = uniqueIp();
    const ip2 = uniqueIp();

    // Exhaust ip1's limit
    for (let i = 0; i < 6; i++) {
      proxy(makeMiddlewareRequest('/api/contact', ip1));
    }

    // ip2 should still be allowed
    const res = proxy(makeMiddlewareRequest('/api/contact', ip2));
    expect(res?.status).not.toBe(429);
  });

  it('rate limiter returns proper 429 JSON body', async () => {
    const ip = uniqueIp();

    // Exhaust limit
    for (let i = 0; i < 6; i++) {
      proxy(makeMiddlewareRequest('/api/contact', ip));
    }

    const res = proxy(makeMiddlewareRequest('/api/contact', ip));
    expect(res?.status).toBe(429);

    const body = await res!.json();
    expect(body.error).toMatch(/too many requests/i);
  });

  it('non-rate-limited routes always pass through', async () => {
    const ip = uniqueIp();

    // Hit a non-API route many times
    for (let i = 0; i < 100; i++) {
      const req = makeMiddlewareRequest('/api/some-other-route', ip);
      const res = proxy(req);
      expect(res?.status).not.toBe(429);
    }
  });
});

describe('rate limiting — IP spoofing resistance', () => {
  let ipCounter2 = 1000;
  function uniqueIp2() {
    ipCounter2++;
    return `172.16.${Math.floor(ipCounter2 / 256)}.${ipCounter2 % 256}`;
  }

  it('x-forwarded-for with multiple IPs uses the first one', () => {
    const realIp = uniqueIp2();
    const results: (NextResponse | undefined)[] = [];

    for (let i = 0; i < 8; i++) {
      const url = new URL('/api/contact', 'http://localhost:3000');
      const req = new NextRequest(url, {
        method: 'POST',
        headers: {
          // Attacker tries to spoof by adding extra IPs
          'x-forwarded-for': `${realIp}, 8.8.8.8, 1.1.1.1`,
          'Content-Type': 'application/json',
        },
      });
      const res = proxy(req);
      results.push(res);
    }

    // Should still be rate-limited based on the first IP
    expect(results[5]?.status).toBe(429);
  });

  it('empty x-forwarded-for falls back to 127.0.0.1', () => {
    // All requests with empty header share the same fallback IP
    const results: (NextResponse | undefined)[] = [];

    for (let i = 0; i < 8; i++) {
      const url = new URL('/api/contact', 'http://localhost:3000');
      const req = new NextRequest(url, {
        method: 'POST',
        headers: {
          'x-forwarded-for': '',
          'Content-Type': 'application/json',
        },
      });
      const res = proxy(req);
      results.push(res);
    }

    // After limit, should get 429
    let has429 = false;
    for (const res of results) {
      if (res?.status === 429) has429 = true;
    }
    expect(has429).toBe(true);
  });
});
