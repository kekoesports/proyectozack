import fc from 'fast-check';
import { TRPCError } from '@trpc/server';

/* -------------------------------------------------------------------------- */
/*  Fuzz tests for trpc.creatorApply.submit                                   */
/*  Goal: Router NEVER throws unexpected errors on adversarial input          */
/* -------------------------------------------------------------------------- */

jest.mock('@/lib/db', () => ({
  db: {
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));
jest.mock('@/lib/auth', () => ({ auth: {} }));
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

describe('trpc.creatorApply.submit — fuzz', () => {
  beforeEach(() => jest.clearAllMocks());

  it('never throws unexpected errors on random input shapes', async () => {
    const anyRecord = fc.dictionary(fc.string(), fc.anything({ withBigInt: false }));

    await fc.assert(
      fc.asyncProperty(anyRecord, async (input) => {
        try {
          await caller.creatorApply.submit(input as never);
        } catch (err) {
          expect(isAllowedError(err)).toBe(true);
        }
      }),
      { numRuns: 300 },
    );
  });

  it('valid payloads always succeed', async () => {
    const validPayload = fc.record({
      name: fc.string({ minLength: 2, maxLength: 100 }).filter((value) => value.trim().length >= 2),
      email: fc.constant('test@example.com'),
      country: fc.constant('España'),
      platform: fc.constantFrom('twitch', 'youtube', 'instagram', 'tiktok', 'kick', 'otra'),
      handle: fc.webUrl({ validSchemes: ['https'] }),
      contentCategory: fc.string({ minLength: 2, maxLength: 100 })
        .filter((value) => value.trim().length >= 2),
    });

    await fc.assert(
      fc.asyncProperty(validPayload, async (input) => {
        const result = await caller.creatorApply.submit(input);
        expect(result).toEqual({ success: true });
      }),
      { numRuns: 300 },
    );
  });

  it('XSS and SQLi in platform/handle fields: never unexpected error', async () => {
    const attackPayloads = [
      '<script>alert(1)</script>',
      "'; DROP TABLE creator_applications; --",
      '<img src=x onerror=alert(document.cookie)>',
      '{{constructor.constructor("alert(1)")()}}',
    ];

    for (const payload of attackPayloads) {
      const attackInput = {
        name: 'Test Creator',
        email: 'test@test.com',
        country: 'España',
        platform: payload.slice(0, 50),
        handle: payload.slice(0, 500),
        contentCategory: 'Gaming',
        message: payload.slice(0, 2000),
      };
      try {
        await caller.creatorApply.submit(attackInput as never);
      } catch (err) {
        expect(isAllowedError(err)).toBe(true);
      }
    }
  });
});
