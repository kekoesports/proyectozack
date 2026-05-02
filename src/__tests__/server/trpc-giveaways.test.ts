/**
 * Tests for trpc.giveaways.trackClick router.
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

import { appRouter } from '@/server/routers/_app';
import { TRPCError } from '@trpc/server';

const caller = appRouter.createCaller({ session: null });

function mockCodeFound(): void {
  mockSelect.mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([{ talentId: 1, brandName: 'Acme' }]),
    }),
  });
  mockInsert.mockReturnValue({
    values: jest.fn().mockResolvedValue(undefined),
  });
}

function mockCodeNotFound(): void {
  mockSelect.mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([]),
    }),
  });
}

describe('trpc.giveaways.trackClick', () => {
  beforeEach(() => jest.clearAllMocks());

  it('inserts click on valid codeId + copy action', async () => {
    mockCodeFound();
    const result = await caller.giveaways.trackClick({ codeId: 1, action: 'copy' });
    expect(result).toEqual({ ok: true });
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it('inserts click on valid codeId + cta action', async () => {
    mockCodeFound();
    const result = await caller.giveaways.trackClick({ codeId: 1, action: 'cta' });
    expect(result).toEqual({ ok: true });
  });

  it('throws NOT_FOUND when code does not exist', async () => {
    mockCodeNotFound();
    await expect(
      caller.giveaways.trackClick({ codeId: 999, action: 'copy' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' } satisfies Partial<TRPCError>);
  });

  it('throws on invalid action value', async () => {
    await expect(
      caller.giveaways.trackClick({ codeId: 1, action: 'invalid' as never }),
    ).rejects.toThrow();
  });

  it('throws on non-positive codeId', async () => {
    await expect(
      caller.giveaways.trackClick({ codeId: 0, action: 'copy' }),
    ).rejects.toThrow();
  });
});
