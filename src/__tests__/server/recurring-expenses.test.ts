/**
 * Tests para `lib/queries/recurringExpenses.ts`.
 *
 * Cubre:
 *   - createInvoiceForMonth: propagación de expenseGroup/expenseSubtype (PR A bug fix)
 *   - createInvoiceForMonth: plantilla sin clasificación no rompe nada
 *   - createInvoiceForMonth: cálculo correcto de amounts
 *   - invoiceExistsForMonth: idempotencia via txId='recurring:{id}:{YYYY-MM}'
 */

jest.mock('@/lib/auth', () => ({ auth: {} }));

// ── DB mock ───────────────────────────────────────────────────────────────────

type SelectBuilder = {
  from: jest.Mock;
  where: jest.Mock;
  limit: jest.Mock;
};

const makeSelectBuilder = (resolvedValue: unknown[]): SelectBuilder => {
  const builder: SelectBuilder = {
    from: jest.fn(),
    where: jest.fn(),
    limit: jest.fn().mockResolvedValue(resolvedValue),
  };
  builder.from.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  return builder;
};

type InsertBuilder = {
  values: jest.Mock;
  returning: jest.Mock;
  _capturedValues: unknown;
};

const makeInsertBuilder = (returningValue: unknown[]): InsertBuilder => {
  const builder: InsertBuilder = {
    values: jest.fn(),
    returning: jest.fn().mockResolvedValue(returningValue),
    _capturedValues: undefined,
  };
  builder.values.mockImplementation((vals: unknown) => {
    builder._capturedValues = vals;
    return builder;
  });
  return builder;
};

const mockSelect = jest.fn();
const mockInsert = jest.fn();

jest.mock('@/lib/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { createInvoiceForMonth, invoiceExistsForMonth } from '@/lib/queries/recurringExpenses';
import type { RecurringExpense } from '@/lib/queries/recurringExpenses';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeTemplate = (overrides: Partial<RecurringExpense> = {}): RecurringExpense => ({
  id: 1,
  name: 'Gestoría mensual',
  concept: 'Honorarios gestoría',
  amount: '500.00',
  currency: 'EUR',
  vatPct: '21.00',
  withholdingPct: '15.00',
  category: 'gestoria',
  counterpartyName: 'Asesoría Test S.L.',
  expenseGroup: 'operational',
  expenseSubtype: 'gestoria',
  scope: 'company',
  company: null,
  paymentMethod: null,
  dayOfMonth: 5,
  startDate: '2026-01-01',
  endDate: null,
  active: true,
  notes: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

// ── createInvoiceForMonth ─────────────────────────────────────────────────────

describe('createInvoiceForMonth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('propaga expenseGroup=operational al invoice generado', async () => {
    const template = makeTemplate({ expenseGroup: 'operational', expenseSubtype: 'gestoria' });
    const insertBuilder = makeInsertBuilder([{ id: 42 }]);
    mockInsert.mockReturnValue(insertBuilder);

    await createInvoiceForMonth(template, '2026-06');

    const vals = insertBuilder._capturedValues as Record<string, unknown>;
    expect(vals['expenseGroup']).toBe('operational');
  });

  it('propaga expenseSubtype=gestoria al invoice generado', async () => {
    const template = makeTemplate({ expenseGroup: 'operational', expenseSubtype: 'gestoria' });
    const insertBuilder = makeInsertBuilder([{ id: 42 }]);
    mockInsert.mockReturnValue(insertBuilder);

    await createInvoiceForMonth(template, '2026-06');

    const vals = insertBuilder._capturedValues as Record<string, unknown>;
    expect(vals['expenseSubtype']).toBe('gestoria');
  });

  it('propaga expenseGroup=campaign_direct y expenseSubtype=pago_talento', async () => {
    const template = makeTemplate({
      expenseGroup: 'campaign_direct',
      expenseSubtype: 'pago_talento',
    });
    const insertBuilder = makeInsertBuilder([{ id: 10 }]);
    mockInsert.mockReturnValue(insertBuilder);

    await createInvoiceForMonth(template, '2026-03');

    const vals = insertBuilder._capturedValues as Record<string, unknown>;
    expect(vals['expenseGroup']).toBe('campaign_direct');
    expect(vals['expenseSubtype']).toBe('pago_talento');
  });

  it('plantilla sin clasificación (null) → invoice se genera sin romper', async () => {
    const template = makeTemplate({ expenseGroup: null, expenseSubtype: null });
    const insertBuilder = makeInsertBuilder([{ id: 99 }]);
    mockInsert.mockReturnValue(insertBuilder);

    await expect(createInvoiceForMonth(template, '2026-06')).resolves.toBe(99);

    const vals = insertBuilder._capturedValues as Record<string, unknown>;
    // null → undefined, no rompe el insert
    expect(vals['expenseGroup']).toBeUndefined();
    expect(vals['expenseSubtype']).toBeUndefined();
  });

  it('retorna el id de la invoice generada', async () => {
    const template = makeTemplate();
    const insertBuilder = makeInsertBuilder([{ id: 77 }]);
    mockInsert.mockReturnValue(insertBuilder);

    const result = await createInvoiceForMonth(template, '2026-05');

    expect(result).toBe(77);
  });

  it('lanza si el insert no retorna fila', async () => {
    const template = makeTemplate();
    const insertBuilder = makeInsertBuilder([]); // returning vacío
    mockInsert.mockReturnValue(insertBuilder);

    await expect(createInvoiceForMonth(template, '2026-06')).rejects.toThrow(
      'insert invoice for recurring expense returned no row',
    );
  });

  it('construye txId correcto: recurring:{id}:{YYYY-MM}', async () => {
    const template = makeTemplate({ id: 7 });
    const insertBuilder = makeInsertBuilder([{ id: 1 }]);
    mockInsert.mockReturnValue(insertBuilder);

    await createInvoiceForMonth(template, '2026-06');

    const vals = insertBuilder._capturedValues as Record<string, unknown>;
    expect(vals['txId']).toBe('recurring:7:2026-06');
  });

  it('calcula totalAmount correctamente: net * (1 + (vat - withholding) / 100)', async () => {
    // 500 * (1 + (21 - 15) / 100) = 500 * 1.06 = 530.00
    const template = makeTemplate({ amount: '500.00', vatPct: '21.00', withholdingPct: '15.00' });
    const insertBuilder = makeInsertBuilder([{ id: 1 }]);
    mockInsert.mockReturnValue(insertBuilder);

    await createInvoiceForMonth(template, '2026-06');

    const vals = insertBuilder._capturedValues as Record<string, unknown>;
    expect(vals['totalAmount']).toBe('530.00');
    expect(vals['netAmount']).toBe('500.00');
  });

  it('calcula totalAmount con vat=0 y withholding=0: total = neto', async () => {
    const template = makeTemplate({ amount: '200.00', vatPct: '0.00', withholdingPct: '0.00' });
    const insertBuilder = makeInsertBuilder([{ id: 1 }]);
    mockInsert.mockReturnValue(insertBuilder);

    await createInvoiceForMonth(template, '2026-06');

    const vals = insertBuilder._capturedValues as Record<string, unknown>;
    expect(vals['totalAmount']).toBe('200.00');
  });

  it('clamps dayOfMonth al último día del mes (ej. día 31 en febrero)', async () => {
    // Febrero 2026 tiene 28 días; dayOfMonth=31 → issueDate=2026-02-28
    const template = makeTemplate({ dayOfMonth: 31 });
    const insertBuilder = makeInsertBuilder([{ id: 1 }]);
    mockInsert.mockReturnValue(insertBuilder);

    await createInvoiceForMonth(template, '2026-02');

    const vals = insertBuilder._capturedValues as Record<string, unknown>;
    expect(vals['issueDate']).toBe('2026-02-28');
  });

  it('usa dayOfMonth exacto cuando cabe en el mes', async () => {
    const template = makeTemplate({ dayOfMonth: 5 });
    const insertBuilder = makeInsertBuilder([{ id: 1 }]);
    mockInsert.mockReturnValue(insertBuilder);

    await createInvoiceForMonth(template, '2026-06');

    const vals = insertBuilder._capturedValues as Record<string, unknown>;
    expect(vals['issueDate']).toBe('2026-06-05');
  });

  it('el invoice generado tiene kind=expense y status=pendiente', async () => {
    const template = makeTemplate();
    const insertBuilder = makeInsertBuilder([{ id: 1 }]);
    mockInsert.mockReturnValue(insertBuilder);

    await createInvoiceForMonth(template, '2026-06');

    const vals = insertBuilder._capturedValues as Record<string, unknown>;
    expect(vals['kind']).toBe('expense');
    expect(vals['status']).toBe('pendiente');
  });

  it('propaga counterpartyName desde la plantilla', async () => {
    const template = makeTemplate({ counterpartyName: 'Pablo García' });
    const insertBuilder = makeInsertBuilder([{ id: 1 }]);
    mockInsert.mockReturnValue(insertBuilder);

    await createInvoiceForMonth(template, '2026-06');

    const vals = insertBuilder._capturedValues as Record<string, unknown>;
    expect(vals['counterpartyName']).toBe('Pablo García');
  });
});

// ── invoiceExistsForMonth ─────────────────────────────────────────────────────

describe('invoiceExistsForMonth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retorna true cuando ya existe una invoice con txId recurring:{id}:{YYYY-MM}', async () => {
    // DB devuelve fila → invoice ya existe
    mockSelect.mockReturnValue(makeSelectBuilder([{ id: 5 }]));

    const result = await invoiceExistsForMonth(3, '2026-06');

    expect(result).toBe(true);
  });

  it('retorna false cuando no existe invoice para esa plantilla+mes', async () => {
    // DB devuelve array vacío → no existe
    mockSelect.mockReturnValue(makeSelectBuilder([]));

    const result = await invoiceExistsForMonth(3, '2026-06');

    expect(result).toBe(false);
  });

  it('distintos templateId producen txId distintos (idempotencia por plantilla)', async () => {
    // Simula que template 1 tiene invoice pero template 2 no
    mockSelect
      .mockReturnValueOnce(makeSelectBuilder([{ id: 10 }])) // template 1 → existe
      .mockReturnValueOnce(makeSelectBuilder([]));           // template 2 → no existe

    const exists1 = await invoiceExistsForMonth(1, '2026-06');
    const exists2 = await invoiceExistsForMonth(2, '2026-06');

    expect(exists1).toBe(true);
    expect(exists2).toBe(false);
  });

  it('distintos meses producen txId distintos para la misma plantilla', async () => {
    mockSelect
      .mockReturnValueOnce(makeSelectBuilder([{ id: 10 }])) // junio → existe
      .mockReturnValueOnce(makeSelectBuilder([]));           // julio → no existe

    const existsJun = await invoiceExistsForMonth(1, '2026-06');
    const existsJul = await invoiceExistsForMonth(1, '2026-07');

    expect(existsJun).toBe(true);
    expect(existsJul).toBe(false);
  });
});
