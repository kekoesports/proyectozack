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
jest.mock('@/lib/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    RESEND_API_KEY: 're_test_000',
    BETTER_AUTH_SECRET: 'test-secret-32-chars-minimum-padding-xx',
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  },
}));

import { appRouter } from '@/server/routers/_app';

const caller = appRouter.createCaller({ session: null });

function isAllowedError(err: unknown): boolean {
  if (err instanceof TRPCError) {
    return err.code === 'BAD_REQUEST' || err.code === 'INTERNAL_SERVER_ERROR';
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
      name: fc.string({ minLength: 2, maxLength: 100 }),
      email: fc.constant('test@example.com'),
      platform: fc.string({ minLength: 1, maxLength: 50 }),
      handle: fc.string({ minLength: 1, maxLength: 100 }),
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
      try {
        await caller.creatorApply.submit({
          name: 'Test Creator',
          email: 'test@test.com',
          platform: payload.slice(0, 50),
          handle: payload.slice(0, 100),
          message: payload.slice(0, 2000),
        });
      } catch (err) {
        expect(isAllowedError(err)).toBe(true);
      }
    }
  });
});
