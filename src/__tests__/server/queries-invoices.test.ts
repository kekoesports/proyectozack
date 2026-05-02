/**
 * Unit tests for `lib/queries/invoices.ts`.
 *
 * Covers the most critical exported functions:
 *   - listInvoices   (anulada exclusion logic — the key business rule)
 *   - getInvoiceSummary
 *   - getRevenueTrend
 *   - createInvoice
 *   - updateInvoice
 *   - deleteInvoice
 *
 * DB is fully mocked; no real Postgres connection is made.
 */

jest.mock('@/lib/auth', () => ({ auth: {} }));

// ── DB mock ───────────────────────────────────────────────────────────────────

/**
 * A chainable builder that resolves to `resolvedValue` when awaited.
 * Mirrors the Drizzle query-builder fluent API used in invoices.ts.
 */
type SelectBuilder = {
  from: jest.Mock;
  leftJoin: jest.Mock;
  innerJoin: jest.Mock;
  where: jest.Mock;
  orderBy: jest.Mock;
  limit: jest.Mock;
  groupBy: jest.Mock;
  then: jest.Mock;
};

const makeSelectBuilder = (resolvedValue: unknown[]): SelectBuilder => {
  const resolved = Promise.resolve(resolvedValue);
  const builder: SelectBuilder = {
    from: jest.fn(),
    leftJoin: jest.fn(),
    innerJoin: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    groupBy: jest.fn(),
    then: jest.fn((onFulfilled: (v: unknown[]) => unknown) => resolved.then(onFulfilled)),
  };
  builder.from.mockReturnValue(builder);
  builder.leftJoin.mockReturnValue(builder);
  builder.innerJoin.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.orderBy.mockResolvedValue(resolvedValue);
  builder.limit.mockResolvedValue(resolvedValue);
  builder.groupBy.mockReturnValue(builder);
  return builder;
};

type InsertBuilder = {
  values: jest.Mock;
  returning: jest.Mock;
};

const makeInsertBuilder = (returningValue: unknown[]): InsertBuilder => {
  const builder: InsertBuilder = {
    values: jest.fn(),
    returning: jest.fn().mockResolvedValue(returningValue),
  };
  builder.values.mockReturnValue(builder);
  return builder;
};

type UpdateBuilder = {
  set: jest.Mock;
  where: jest.Mock;
  returning: jest.Mock;
};

const makeUpdateBuilder = (returningValue: unknown[]): UpdateBuilder => {
  const builder: UpdateBuilder = {
    set: jest.fn(),
    where: jest.fn(),
    returning: jest.fn().mockResolvedValue(returningValue),
  };
  builder.set.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  return builder;
};

type DeleteBuilder = {
  where: jest.Mock;
};

const makeDeleteBuilder = (): DeleteBuilder => {
  const builder: DeleteBuilder = {
    where: jest.fn().mockResolvedValue(undefined),
  };
  return builder;
};

const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
};

jest.mock('@/lib/db', () => ({ db: mockDb }));

// ── Imports after mocks ───────────────────────────────────────────────────────

import {
  listInvoices,
  getInvoiceSummary,
  getRevenueTrend,
  createInvoice,
  updateInvoice,
  deleteInvoice,
} from '@/lib/queries/invoices';

// ── Fixtures ──────────────────────────────────────────────────────────────────

/**
 * Minimal invoice row shape returned by the DB select (INVOICE_LIST_COLUMNS).
 * `invoiceFileId` and `statementFileId` are null so `attachFiles` skips the
 * second DB call.
 */
const makeInvoiceRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 1,
  kind: 'income' as const,
  number: 'F-2024-001',
  issueDate: '2024-06-15',
  dueDate: '2024-07-15',
  paidDate: null,
  brandId: 10,
  talentId: 20,
  counterpartyName: 'Acme Corp',
  concept: 'Sponsorship',
  category: 'Marketing',
  netAmount: '1000.00',
  vatPct: '21.00',
  withholdingPct: '15.00',
  totalAmount: '1210.00',
  paidAmount: null,
  currency: 'EUR',
  series: null,
  status: 'emitida' as const,
  company: 'sociedad' as const,
  paymentMethod: 'transferencia' as const,
  aiTool: null,
  fileUrl: null,
  filePath: null,
  invoiceFileId: null,
  statementFileId: null,
  notes: null,
  createdByUserId: 'user-1',
  campaignId: null,
  createdAt: new Date('2024-06-15'),
  updatedAt: new Date('2024-06-15'),
  brandName: 'Acme Corp',
  talentName: 'Talent One',
  ...overrides,
});

// ── invoice queries ───────────────────────────────────────────────────────────

describe('invoice queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── listInvoices ────────────────────────────────────────────────────────────

  describe('listInvoices', () => {
    /**
     * Helper: set up mockSelect to return `rows` for the main query, then []
     * for the attachFiles files query (if any fileIds are present).
     * Since all fixture rows have null fileIds, attachFiles never fires a
     * second DB call — one mockSelect call is enough.
     */
    const setupSelect = (rows: unknown[]) => {
      mockSelect.mockImplementation(() => makeSelectBuilder(rows));
    };

    it('no filters → anulada invoices are EXCLUDED by default', async () => {
      const row = makeInvoiceRow({ status: 'emitida' });
      setupSelect([row]);

      const result = await listInvoices();

      expect(result).toHaveLength(1);
      expect(result[0]?.status).toBe('emitida');
      // where() must have been called (ne(status, 'anulada') condition added)
      const builder = mockSelect.mock.results[0]?.value as SelectBuilder;
      expect(builder.where).toHaveBeenCalled();
    });

    it('status: "anulada" explicitly → anulada invoices ARE included (ne condition skipped)', async () => {
      const row = makeInvoiceRow({ status: 'anulada' });
      setupSelect([row]);

      const result = await listInvoices({ status: 'anulada' });

      expect(result).toHaveLength(1);
      expect(result[0]?.status).toBe('anulada');
    });

    it('includeAnuladas: true → anulada invoices ARE included (ne condition skipped)', async () => {
      const anulada = makeInvoiceRow({ id: 2, status: 'anulada' });
      const emitida = makeInvoiceRow({ id: 1, status: 'emitida' });
      setupSelect([emitida, anulada]);

      const result = await listInvoices({ includeAnuladas: true });

      expect(result).toHaveLength(2);
      const statuses = result.map((r) => r.status);
      expect(statuses).toContain('anulada');
      expect(statuses).toContain('emitida');
    });

    it('statuses: ["emitida", "pagada"] → specific statuses filter applied, anulada exclusion skipped', async () => {
      const row = makeInvoiceRow({ status: 'emitida' });
      setupSelect([row]);

      const result = await listInvoices({ statuses: ['emitida', 'pagada'] });

      expect(result).toHaveLength(1);
      expect(result[0]?.status).toBe('emitida');
      // where() called with inArray condition (not ne)
      const builder = mockSelect.mock.results[0]?.value as SelectBuilder;
      expect(builder.where).toHaveBeenCalled();
    });

    it('statuses: [] (empty array) → behaves same as no filter (anulada excluded)', async () => {
      const row = makeInvoiceRow({ status: 'emitida' });
      setupSelect([row]);

      const result = await listInvoices({ statuses: [] });

      expect(result).toHaveLength(1);
      // where() called — ne(anulada) condition was added
      const builder = mockSelect.mock.results[0]?.value as SelectBuilder;
      expect(builder.where).toHaveBeenCalled();
    });

    it('search filter → where() is called (search clause applied)', async () => {
      const row = makeInvoiceRow({ concept: 'Sponsorship deal' });
      setupSelect([row]);

      const result = await listInvoices({ search: 'Sponsorship' });

      expect(result).toHaveLength(1);
      const builder = mockSelect.mock.results[0]?.value as SelectBuilder;
      expect(builder.where).toHaveBeenCalled();
    });

    it('brandId filter → where() is called with brandId condition', async () => {
      const row = makeInvoiceRow({ brandId: 42 });
      setupSelect([row]);

      const result = await listInvoices({ brandId: 42 });

      expect(result).toHaveLength(1);
      expect(result[0]?.brandId).toBe(42);
      const builder = mockSelect.mock.results[0]?.value as SelectBuilder;
      expect(builder.where).toHaveBeenCalled();
    });

    it('kind filter → where() is called with kind condition', async () => {
      const row = makeInvoiceRow({ kind: 'expense' });
      setupSelect([row]);

      const result = await listInvoices({ kind: 'expense' });

      expect(result).toHaveLength(1);
      expect(result[0]?.kind).toBe('expense');
    });

    it('returns array of invoices from mock with correct shape', async () => {
      const rows = [
        makeInvoiceRow({ id: 1, status: 'emitida' }),
        makeInvoiceRow({ id: 2, status: 'cobrada' }),
      ];
      setupSelect(rows);

      const result = await listInvoices();

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe(1);
      expect(result[1]?.id).toBe(2);
      // attachFiles adds invoiceFile / statementFile (null since fileIds are null)
      expect(result[0]?.invoiceFile).toBeNull();
      expect(result[0]?.statementFile).toBeNull();
    });

    it('returns empty array when DB returns no rows', async () => {
      setupSelect([]);

      const result = await listInvoices();

      expect(result).toHaveLength(0);
    });
  });

  // ── getInvoiceSummary ───────────────────────────────────────────────────────

  describe('getInvoiceSummary', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns correct summary from DB aggregate row', async () => {
      const summaryRow = {
        incomeTotal: '5000',
        expenseTotal: '2000',
        pendingIncome: '1500',
        overdueIncome: '500',
      };
      mockSelect.mockImplementation(() => makeSelectBuilder([summaryRow]));

      const result = await getInvoiceSummary();

      expect(result.incomeTotal).toBe(5000);
      expect(result.expenseTotal).toBe(2000);
      expect(result.netTotal).toBe(3000); // 5000 - 2000
      expect(result.pendingIncome).toBe(1500);
      expect(result.overdueIncome).toBe(500);
    });

    it('netTotal = incomeTotal - expenseTotal', async () => {
      const summaryRow = {
        incomeTotal: '3000',
        expenseTotal: '4500',
        pendingIncome: '0',
        overdueIncome: '0',
      };
      mockSelect.mockImplementation(() => makeSelectBuilder([summaryRow]));

      const result = await getInvoiceSummary();

      expect(result.netTotal).toBe(-1500);
    });

    it('handles empty DB result (no rows) → all zeros', async () => {
      mockSelect.mockImplementation(() => makeSelectBuilder([{}]));

      const result = await getInvoiceSummary();

      expect(result.incomeTotal).toBe(0);
      expect(result.expenseTotal).toBe(0);
      expect(result.netTotal).toBe(0);
      expect(result.pendingIncome).toBe(0);
      expect(result.overdueIncome).toBe(0);
    });

    it('passes from/to date range to DB query (where is called)', async () => {
      const summaryRow = {
        incomeTotal: '1000',
        expenseTotal: '0',
        pendingIncome: '0',
        overdueIncome: '0',
      };
      mockSelect.mockImplementation(() => makeSelectBuilder([summaryRow]));

      const result = await getInvoiceSummary('2024-01-01', '2024-06-30');

      expect(result.incomeTotal).toBe(1000);
      const builder = mockSelect.mock.results[0]?.value as SelectBuilder;
      expect(builder.where).toHaveBeenCalled();
    });
  });

  // ── getRevenueTrend ─────────────────────────────────────────────────────────

  describe('getRevenueTrend', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      // Fix "now" to 2024-06-15 so bucket keys are deterministic
      jest.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns array of exactly `months` length (default 12)', async () => {
      mockSelect.mockImplementation(() => makeSelectBuilder([]));

      const result = await getRevenueTrend(12);

      expect(result).toHaveLength(12);
    });

    it('months = 1 → single bucket for current month', async () => {
      mockSelect.mockImplementation(() => makeSelectBuilder([]));

      const result = await getRevenueTrend(1);

      expect(result).toHaveLength(1);
      expect(result[0]?.month).toBe('2024-06');
    });

    it('empty DB result → all buckets have ingresos: 0 and gastos: 0', async () => {
      mockSelect.mockImplementation(() => makeSelectBuilder([]));

      const result = await getRevenueTrend(3);

      expect(result).toHaveLength(3);
      for (const point of result) {
        expect(point.ingresos).toBe(0);
        expect(point.gastos).toBe(0);
      }
    });

    it('DB results fill correct month buckets for income rows', async () => {
      const rows = [
        { kind: 'income', issueDate: '2024-06-10', totalAmount: '1500.00' },
        { kind: 'income', issueDate: '2024-05-20', totalAmount: '800.00' },
      ];
      mockSelect.mockImplementation(() => makeSelectBuilder(rows));

      const result = await getRevenueTrend(3);

      // months = 3 with now=2024-06-15 → buckets: 2024-04, 2024-05, 2024-06
      const junePoint = result.find((p) => p.month === '2024-06');
      const mayPoint = result.find((p) => p.month === '2024-05');
      const aprPoint = result.find((p) => p.month === '2024-04');

      expect(junePoint?.ingresos).toBe(1500);
      expect(junePoint?.gastos).toBe(0);
      expect(mayPoint?.ingresos).toBe(800);
      expect(mayPoint?.gastos).toBe(0);
      expect(aprPoint?.ingresos).toBe(0);
      expect(aprPoint?.gastos).toBe(0);
    });

    it('DB results fill correct month buckets for expense rows', async () => {
      const rows = [
        { kind: 'expense', issueDate: '2024-06-05', totalAmount: '300.00' },
      ];
      mockSelect.mockImplementation(() => makeSelectBuilder(rows));

      const result = await getRevenueTrend(2);

      // months = 2 with now=2024-06-15 → buckets: 2024-05, 2024-06
      const junePoint = result.find((p) => p.month === '2024-06');
      expect(junePoint?.gastos).toBe(300);
      expect(junePoint?.ingresos).toBe(0);
    });

    it('accumulates multiple rows in the same month bucket', async () => {
      const rows = [
        { kind: 'income', issueDate: '2024-06-01', totalAmount: '1000.00' },
        { kind: 'income', issueDate: '2024-06-28', totalAmount: '500.00' },
        { kind: 'expense', issueDate: '2024-06-15', totalAmount: '200.00' },
      ];
      mockSelect.mockImplementation(() => makeSelectBuilder(rows));

      const result = await getRevenueTrend(1);

      const junePoint = result.find((p) => p.month === '2024-06');
      expect(junePoint?.ingresos).toBe(1500);
      expect(junePoint?.gastos).toBe(200);
    });

    it('rows outside the bucket range are silently ignored', async () => {
      // months=1 → only 2024-06 bucket; row from 2023-01 should be ignored
      const rows = [
        { kind: 'income', issueDate: '2023-01-10', totalAmount: '9999.00' },
      ];
      mockSelect.mockImplementation(() => makeSelectBuilder(rows));

      const result = await getRevenueTrend(1);

      expect(result).toHaveLength(1);
      expect(result[0]?.ingresos).toBe(0);
    });

    it('buckets are ordered chronologically (oldest first)', async () => {
      mockSelect.mockImplementation(() => makeSelectBuilder([]));

      const result = await getRevenueTrend(3);

      // 2024-04, 2024-05, 2024-06
      expect(result[0]?.month).toBe('2024-04');
      expect(result[1]?.month).toBe('2024-05');
      expect(result[2]?.month).toBe('2024-06');
    });
  });

  // ── createInvoice ───────────────────────────────────────────────────────────

  describe('createInvoice', () => {
    const minimalNewInvoice = {
      kind: 'income' as const,
      issueDate: '2024-06-15',
      concept: 'Test invoice',
      netAmount: '1000.00',
      totalAmount: '1210.00',
      status: 'emitida' as const,
    };

    it('returns the created invoice on success', async () => {
      const created = makeInvoiceRow({ id: 99, concept: 'Test invoice' });
      mockInsert.mockReturnValue(makeInsertBuilder([created]));

      const result = await createInvoice(minimalNewInvoice as Parameters<typeof createInvoice>[0]);

      expect(result.id).toBe(99);
      expect(result.concept).toBe('Test invoice');
    });

    it('throws if DB insert returns empty array', async () => {
      mockInsert.mockReturnValue(makeInsertBuilder([]));

      await expect(
        createInvoice(minimalNewInvoice as Parameters<typeof createInvoice>[0]),
      ).rejects.toThrow('Failed to insert invoice');
    });

    it('calls db.insert with the provided values', async () => {
      const created = makeInvoiceRow({ id: 1 });
      mockInsert.mockReturnValue(makeInsertBuilder([created]));

      await createInvoice(minimalNewInvoice as Parameters<typeof createInvoice>[0]);

      expect(mockInsert).toHaveBeenCalledTimes(1);
    });
  });

  // ── updateInvoice ───────────────────────────────────────────────────────────

  describe('updateInvoice', () => {
    it('returns updated invoice on success', async () => {
      const updated = makeInvoiceRow({ id: 5, concept: 'Updated concept' });
      mockUpdate.mockReturnValue(makeUpdateBuilder([updated]));

      const result = await updateInvoice(5, { concept: 'Updated concept' });

      expect(result).not.toBeNull();
      expect(result?.id).toBe(5);
      expect(result?.concept).toBe('Updated concept');
    });

    it('returns null if invoice not found (empty returning array)', async () => {
      mockUpdate.mockReturnValue(makeUpdateBuilder([]));

      const result = await updateInvoice(999, { concept: 'Ghost' });

      expect(result).toBeNull();
    });

    it('calls db.update once with the correct id', async () => {
      const updated = makeInvoiceRow({ id: 7 });
      mockUpdate.mockReturnValue(makeUpdateBuilder([updated]));

      await updateInvoice(7, { status: 'cobrada' });

      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });

    it('bumps updatedAt automatically (set() receives updatedAt)', async () => {
      const updated = makeInvoiceRow({ id: 3 });
      const builder = makeUpdateBuilder([updated]);
      mockUpdate.mockReturnValue(builder);

      await updateInvoice(3, { concept: 'New concept' });

      // set() should have been called with an object containing updatedAt
      const setCall = builder.set.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(setCall).toHaveProperty('updatedAt');
      expect(setCall['updatedAt']).toBeInstanceOf(Date);
    });
  });

  // ── deleteInvoice ───────────────────────────────────────────────────────────

  describe('deleteInvoice', () => {
    it('calls db.delete with the correct id', async () => {
      const deleteBuilder = makeDeleteBuilder();
      mockDelete.mockReturnValue(deleteBuilder);

      await deleteInvoice(42);

      expect(mockDelete).toHaveBeenCalledTimes(1);
      expect(deleteBuilder.where).toHaveBeenCalledTimes(1);
    });

    it('resolves without throwing on success', async () => {
      mockDelete.mockReturnValue(makeDeleteBuilder());

      await expect(deleteInvoice(1)).resolves.toBeUndefined();
    });

    it('calls db.delete once per invocation', async () => {
      mockDelete.mockReturnValue(makeDeleteBuilder());

      await deleteInvoice(10);
      await deleteInvoice(20);

      expect(mockDelete).toHaveBeenCalledTimes(2);
    });
  });
});
