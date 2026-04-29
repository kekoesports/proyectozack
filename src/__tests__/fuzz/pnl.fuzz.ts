jest.mock('@/lib/env', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    RESEND_API_KEY: 're_test_000',
    BETTER_AUTH_SECRET: 'test-secret-32-chars-minimum-padding-xx',
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  },
}));
jest.mock('@/lib/auth', () => ({ auth: {} }));

import fc from 'fast-check';

type SelectBuilder = {
  from: jest.Mock;
  leftJoin: jest.Mock;
  innerJoin: jest.Mock;
  where: jest.Mock;
  groupBy: jest.Mock;
  orderBy: jest.Mock;
  limit: jest.Mock;
  then: jest.Mock;
};

const makeSelectBuilder = (resolvedValue: unknown[]): SelectBuilder => {
  const resolved = Promise.resolve(resolvedValue);
  const builder: SelectBuilder = {
    from: jest.fn(),
    leftJoin: jest.fn(),
    innerJoin: jest.fn(),
    where: jest.fn(),
    groupBy: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    then: jest.fn((onFulfilled: (v: unknown[]) => unknown) => resolved.then(onFulfilled)),
  };
  builder.from.mockReturnValue(builder);
  builder.leftJoin.mockReturnValue(builder);
  builder.innerJoin.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.groupBy.mockReturnValue(builder);
  builder.orderBy.mockReturnValue(builder);
  builder.limit.mockReturnValue(builder);
  return builder;
};

const mockSelect = jest.fn();

jest.mock('@/lib/db', () => ({
  db: { select: mockSelect },
}));

import { getPnL } from '@/lib/queries/pnl';

const STATUSES = [
  'cobrada',
  'pagada',
  'emitida',
  'no_cobrada',
  'no_pagada',
  'parcial',
  'vencida',
  'borrador',
] as const;

const invoiceArb = fc.record({
  kind: fc.constantFrom('income', 'expense') as fc.Arbitrary<'income' | 'expense'>,
  status: fc.constantFrom(...STATUSES) as fc.Arbitrary<(typeof STATUSES)[number]>,
  totalAmount: fc.float({ min: 0, max: 50_000, noNaN: true }).map((n) => n.toFixed(2)),
  paidAmount: fc.constant<string>('0.00'),
  campaignId: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: null }),
  talentId: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: null }),
  category: fc.option(fc.constantFrom('campaña', 'IA', 'comisión', 'gestoría', 'software'), { nil: null }),
  issueDate: fc.constant('2026-01-15'),
  brandSector: fc.constant<string | null>(null),
  brandGeo: fc.constant<string | null>(null),
});

beforeEach(() => {
  mockSelect.mockReset();
});

describe('getPnL — invariants', () => {
  it('margenBruto === ingresos - gastos for any invoice mix', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(invoiceArb, { maxLength: 60 }), async (rows) => {
        mockSelect.mockReturnValue(makeSelectBuilder(rows));
        const pnl = await getPnL();
        return Math.abs(pnl.margenBruto - (pnl.ingresos - pnl.gastos)) < 0.01;
      }),
      { numRuns: 200 },
    );
  });

  it('pagosCreadores <= gastos always', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(invoiceArb, { maxLength: 60 }), async (rows) => {
        mockSelect.mockReturnValue(makeSelectBuilder(rows));
        const pnl = await getPnL();
        return pnl.pagosCreadores <= pnl.gastos + 0.01;
      }),
      { numRuns: 200 },
    );
  });

  it('pendienteCobro and pendientePago are non-negative', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(invoiceArb, { maxLength: 60 }), async (rows) => {
        mockSelect.mockReturnValue(makeSelectBuilder(rows));
        const pnl = await getPnL();
        return pnl.pendienteCobro >= 0 && pnl.pendientePago >= 0;
      }),
      { numRuns: 200 },
    );
  });

  it('breakdownByMonth ingresos sum equals total ingresos', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(invoiceArb, { maxLength: 60 }), async (rows) => {
        mockSelect.mockReturnValue(makeSelectBuilder(rows));
        const pnl = await getPnL();
        const summed = pnl.breakdownByMonth.reduce((acc, m) => acc + m.ingresos, 0);
        return Math.abs(summed - pnl.ingresos) < 0.01;
      }),
      { numRuns: 200 },
    );
  });
});
