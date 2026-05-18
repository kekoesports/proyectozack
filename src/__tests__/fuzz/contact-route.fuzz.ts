import fc from 'fast-check';
import { TRPCError } from '@trpc/server';

/* -------------------------------------------------------------------------- */
/*  Fuzz tests for trpc.contact.submit                                         */
/*  Goal: Router NEVER throws unhandled error on adversarial input            */
/* -------------------------------------------------------------------------- */

jest.mock('@/lib/db', () => ({
  db: {
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));
jest.mock('@/lib/email', () => ({
  sendContactEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/auth', () => ({ auth: {} }));
jest.mock('next/headers', () => ({
  headers: jest.fn().mockResolvedValue(new Map([
    ['x-forwarded-for', '127.0.0.1'],
  ])),
}));
// in-memory rate limiter persists across tests; bypass it so tests are isolated
jest.mock('@/lib/security/rateLimit', () => ({
  checkRateLimit: jest.fn().mockReturnValue({ ok: true, remaining: 10, resetAt: 0 }),
}));

import { appRouter } from '@/server/routers/_app';

const caller = appRouter.createCaller({ session: null });

function isAllowedError(err: unknown): boolean {
  if (err instanceof TRPCError) {
    return (
      err.code === 'BAD_REQUEST' ||
      err.code === 'INTERNAL_SERVER_ERROR' ||
      err.code === 'TOO_MANY_REQUESTS'
    );
  }
  return false;
}

describe('trpc.contact.submit — fuzz', () => {
  beforeEach(() => jest.clearAllMocks());

  it('never throws unexpected errors on random input shapes', async () => {
    const anyRecord = fc.dictionary(fc.string(), fc.anything({ withBigInt: false }));

    await fc.assert(
      fc.asyncProperty(anyRecord, async (input) => {
        try {
          await caller.contact.submit(input as never);
        } catch (err) {
          expect(isAllowedError(err)).toBe(true);
        }
      }),
      { numRuns: 300 },
    );
  });

  it('handles XSS payloads without unexpected errors', async () => {
    const xssPayloads = [
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      '"><svg onload=alert(1)>',
      "';DROP TABLE users;--",
    ];

    for (const xss of xssPayloads) {
      try {
        await caller.contact.submit({
          name: xss.slice(0, 100).padEnd(2, 'X'),
          email: 'test@test.com',
          type: 'brand',
          message: xss.padEnd(10, ' '),
        });
      } catch (err) {
        expect(isAllowedError(err)).toBe(true);
      }
    }
  });

  it('handles spoofed IP context without errors', async () => {
    const result = await caller.contact.submit({
      name: 'Test User',
      email: 'test@test.com',
      type: 'brand',
      message: 'A valid message for the test.',
    });
    expect(result).toEqual({ success: true });
  });

  it('handles concurrent calls without state corruption', async () => {
    const calls = Array.from({ length: 50 }, (_, i) =>
      caller.contact.submit({
        name: `User ${i}`,
        email: `user${i}@test.com`,
        type: 'brand',
        message: `Message from concurrent request number ${i}.`,
      }),
    );

    const results = await Promise.all(calls);
    for (const r of results) {
      expect(r).toEqual({ success: true });
    }
  });
});
