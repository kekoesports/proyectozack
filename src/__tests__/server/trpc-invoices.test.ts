/**
 * Tests for trpc.invoices.exportCsv router.
 * Uses strictAdminProcedure — caller must have role 'admin'.
 */

jest.mock('@/lib/queries/invoices', () => ({
  listInvoices: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/lib/exports/fiscal', () => ({
  buildModelo303Csv: jest.fn().mockReturnValue('303-csv-content'),
  buildModelo130Csv: jest.fn().mockReturnValue('130-csv-content'),
  buildModelo347Csv: jest.fn().mockReturnValue('347-csv-content'),
  quarterRange: jest.fn().mockReturnValue({ from: '2025-01-01', to: '2025-03-31' }),
  yearRange: jest.fn().mockReturnValue({ from: '2025-01-01', to: '2025-12-31' }),
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
import { buildModelo303Csv, buildModelo130Csv, buildModelo347Csv } from '@/lib/exports/fiscal';
import { TRPCError } from '@trpc/server';

const adminCaller = appRouter.createCaller({
  session: { userId: 'admin-1', email: 'admin@test.com', name: 'Admin', role: 'admin' },
});
const brandCaller = appRouter.createCaller({
  session: { userId: 'brand-1', email: 'brand@test.com', name: 'Brand', role: 'brand' },
});
const anonCaller = appRouter.createCaller({ session: null });

describe('trpc.invoices.exportCsv', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('Modelo 303', () => {
    it('returns csv and filename for valid params', async () => {
      const result = await adminCaller.invoices.exportCsv({ modelo: '303', year: 2025, quarter: 1 });
      expect(result.filename).toBe('modelo-303-2025-T1.csv');
      expect(result.csv).toContain('303-csv-content');
      expect(buildModelo303Csv).toHaveBeenCalledTimes(1);
    });

    it('throws BAD_REQUEST when quarter is missing', async () => {
      await expect(
        adminCaller.invoices.exportCsv({ modelo: '303', year: 2025 }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' } satisfies Partial<TRPCError>);
    });
  });

  describe('Modelo 130', () => {
    it('returns csv and filename for valid params', async () => {
      const result = await adminCaller.invoices.exportCsv({ modelo: '130', year: 2025, quarter: 2 });
      expect(result.filename).toBe('modelo-130-2025-T2.csv');
      expect(result.csv).toContain('130-csv-content');
      expect(buildModelo130Csv).toHaveBeenCalledTimes(1);
    });

    it('throws BAD_REQUEST when quarter is missing', async () => {
      await expect(
        adminCaller.invoices.exportCsv({ modelo: '130', year: 2025 }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' } satisfies Partial<TRPCError>);
    });
  });

  describe('Modelo 347', () => {
    it('returns csv and filename without quarter', async () => {
      const result = await adminCaller.invoices.exportCsv({ modelo: '347', year: 2025 });
      expect(result.filename).toBe('modelo-347-2025.csv');
      expect(result.csv).toContain('347-csv-content');
      expect(buildModelo347Csv).toHaveBeenCalledTimes(1);
    });
  });

  describe('Authorization', () => {
    it('throws FORBIDDEN for brand user', async () => {
      await expect(
        brandCaller.invoices.exportCsv({ modelo: '347', year: 2025 }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' } satisfies Partial<TRPCError>);
    });

    it('throws FORBIDDEN for anonymous caller', async () => {
      await expect(
        anonCaller.invoices.exportCsv({ modelo: '347', year: 2025 }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' } satisfies Partial<TRPCError>);
    });
  });

  describe('Input validation', () => {
    it('throws on invalid modelo', async () => {
      await expect(
        adminCaller.invoices.exportCsv({ modelo: '999' as never, year: 2025 }),
      ).rejects.toThrow();
    });

    it('throws on year out of range', async () => {
      await expect(
        adminCaller.invoices.exportCsv({ modelo: '347', year: 1999 }),
      ).rejects.toThrow();
    });
  });
});
