/**
 * Tests for trpc.proposals.submit router.
 * Uses brandProcedure — caller must have role 'brand'.
 */

const mockSelect = jest.fn();
const mockInsert = jest.fn();

jest.mock('@/lib/db', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
  },
}));
jest.mock('@/lib/auth', () => ({ auth: {} }));
jest.mock('next/headers', () => ({
  headers: jest.fn().mockResolvedValue(new Map()),
}));
jest.mock('@/lib/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    RESEND_API_KEY: 're_test_000',
    BETTER_AUTH_SECRET: 'test-secret-32-chars-minimum-padding-xx',
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  },
}));

import { appRouter } from '@/server/routers/_app';
import { TRPCError } from '@trpc/server';

const brandCaller = appRouter.createCaller({
  session: { userId: 'brand-user-1', email: 'brand@test.com', name: 'Brand', role: 'brand' },
});
const anonCaller = appRouter.createCaller({ session: null });
const adminCaller = appRouter.createCaller({
  session: { userId: 'admin-1', email: 'admin@test.com', name: 'Admin', role: 'admin' },
});

const validInput = {
  talentId: 1,
  campaignType: 'Streaming' as const,
  budgetRange: '5-10K' as const,
  timeline: '1 mes' as const,
  message: 'Quiero colaborar en una campaña de streaming para mi marca.',
};

function mockTalentExists(): void {
  mockSelect
    .mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: 1 }]),
      }),
    })
    // existing proposals check — none
    .mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      }),
    });
  mockInsert.mockReturnValue({
    values: jest.fn().mockResolvedValue(undefined),
  });
}

function mockTalentNotFound(): void {
  mockSelect.mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([]),
    }),
  });
}

function mockExistingProposal(): void {
  mockSelect
    .mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: 1 }]),
      }),
    })
    .mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: 42 }]),
      }),
    });
}

describe('trpc.proposals.submit', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates proposal for brand user', async () => {
    mockTalentExists();
    const result = await brandCaller.proposals.submit(validInput);
    expect(result).toEqual({ success: true });
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it('throws FORBIDDEN for unauthenticated caller', async () => {
    await expect(
      anonCaller.proposals.submit(validInput),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' } satisfies Partial<TRPCError>);
  });

  it('throws FORBIDDEN for admin caller (wrong role)', async () => {
    await expect(
      adminCaller.proposals.submit(validInput),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' } satisfies Partial<TRPCError>);
  });

  it('throws BAD_REQUEST when talent does not exist', async () => {
    mockTalentNotFound();
    await expect(
      brandCaller.proposals.submit(validInput),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' } satisfies Partial<TRPCError>);
  });

  it('throws CONFLICT when pending proposal already exists', async () => {
    mockExistingProposal();
    await expect(
      brandCaller.proposals.submit(validInput),
    ).rejects.toMatchObject({ code: 'CONFLICT' } satisfies Partial<TRPCError>);
  });

  it('throws on message too short', async () => {
    await expect(
      brandCaller.proposals.submit({ ...validInput, message: 'corto' }),
    ).rejects.toThrow();
  });

  it('throws on invalid campaignType', async () => {
    await expect(
      brandCaller.proposals.submit({ ...validInput, campaignType: 'Invalid' as never }),
    ).rejects.toThrow();
  });
});
