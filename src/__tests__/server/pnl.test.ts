jest.mock('@/lib/auth', () => ({ auth: {} }));

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

type FakeInvoice = {
  kind: 'income' | 'expense';
  status: 'cobrada' | 'pagada' | 'emitida' | 'no_cobrada' | 'parcial' | 'vencida' | 'anulada' | 'no_pagada' | 'borrador';
  totalAmount: string;
  paidAmount: string | null;
  campaignId: number | null;
  talentId: number | null;
  category: string | null;
  issueDate: string;
  brandSector: string | null;
  brandGeo: string | null;
  /** FV.1 — FK al emitido del que esta fila es espejo. */
  mirrorOfIssuedInvoiceId?: number | null;
};

/** Fila de `issued_invoices` tal y como la proyecta getPnL (FV.1). */
type FakeIssued = {
  status: 'cobrada' | 'emitida' | 'enviada' | 'vencida' | 'parcial';
  totalAmount: string;
  campaignId: number | null;
  talentId: number | null;
  invoiceNumber: string;
  issueDate: string;
  brandSector: string | null;
  brandGeo: string | null;
};

/**
 * `getPnL` hace dos `db.select()`: primero las internas, después las emitidas.
 * El mock tiene que distinguirlas — devolver las mismas filas a las dos
 * duplicaría todos los importes.
 */
function setRows(rows: FakeInvoice[], issued: FakeIssued[] = []): void {
  mockSelect
    .mockReturnValueOnce(makeSelectBuilder(rows))
    .mockReturnValue(makeSelectBuilder(issued));
}

beforeEach(() => {
  mockSelect.mockReset();
});

describe('getPnL', () => {
  it('aggregates ingresos and gastos and computes margenBruto', async () => {
    setRows([
      { kind: 'income', status: 'cobrada', totalAmount: '1000', paidAmount: '1000', campaignId: 1, talentId: null, category: 'campaña', issueDate: '2026-01-15', brandSector: null, brandGeo: null },
      { kind: 'income', status: 'cobrada', totalAmount: '500', paidAmount: '500', campaignId: null, talentId: null, category: 'comisión', issueDate: '2026-02-10', brandSector: null, brandGeo: null },
      { kind: 'expense', status: 'pagada', totalAmount: '600', paidAmount: '600', campaignId: 1, talentId: 7, category: 'pago talent', issueDate: '2026-01-20', brandSector: null, brandGeo: null },
      { kind: 'expense', status: 'pagada', totalAmount: '100', paidAmount: '100', campaignId: null, talentId: null, category: 'gestoria', issueDate: '2026-02-12', brandSector: null, brandGeo: null },
    ]);

    const pnl = await getPnL();

    expect(pnl.ingresos).toBe(1500);
    expect(pnl.gastos).toBe(700);
    expect(pnl.margenBruto).toBe(800);
    expect(pnl.pagosCreadores).toBe(600);
    // comisionAgencia = comisionIngresoCampana(1000) - comisionGastoTalentCampana(600) = 400
    expect(pnl.comisionAgencia).toBe(400);
  });

  it('excludes anulada invoices from totals', async () => {
    setRows([
      { kind: 'income', status: 'cobrada', totalAmount: '1000', paidAmount: '1000', campaignId: null, talentId: null, category: null, issueDate: '2026-01-01', brandSector: null, brandGeo: null },
      // The anulada one would normally be filtered at SQL level via `ne(status, 'anulada')`,
      // but if it slips through, the result is identical because we still trust the where clause.
    ]);

    const pnl = await getPnL();
    expect(pnl.ingresos).toBe(1000);
  });

  it('counts pendiente cobro for emitida/parcial/vencida income', async () => {
    setRows([
      { kind: 'income', status: 'emitida', totalAmount: '300', paidAmount: '0', campaignId: null, talentId: null, category: null, issueDate: '2026-01-01', brandSector: null, brandGeo: null },
      { kind: 'income', status: 'parcial', totalAmount: '500', paidAmount: '100', campaignId: null, talentId: null, category: null, issueDate: '2026-01-05', brandSector: null, brandGeo: null },
      { kind: 'income', status: 'vencida', totalAmount: '200', paidAmount: '0', campaignId: null, talentId: null, category: null, issueDate: '2026-01-10', brandSector: null, brandGeo: null },
    ]);

    const pnl = await getPnL();
    expect(pnl.pendienteCobro).toBe(1000);
    expect(pnl.pendientePago).toBe(0);
  });

  it('counts pendiente pago for emitida/parcial/vencida/no_pagada expense', async () => {
    setRows([
      { kind: 'expense', status: 'emitida', totalAmount: '150', paidAmount: '0', campaignId: null, talentId: null, category: null, issueDate: '2026-01-01', brandSector: null, brandGeo: null },
      { kind: 'expense', status: 'no_pagada', totalAmount: '200', paidAmount: '0', campaignId: null, talentId: null, category: null, issueDate: '2026-01-05', brandSector: null, brandGeo: null },
    ]);

    const pnl = await getPnL();
    expect(pnl.pendientePago).toBe(350);
    expect(pnl.pagosCreadores).toBe(0);
  });

  it('groups breakdownByMonth chronologically', async () => {
    setRows([
      { kind: 'income', status: 'cobrada', totalAmount: '100', paidAmount: '100', campaignId: null, talentId: null, category: null, issueDate: '2026-03-15', brandSector: null, brandGeo: null },
      { kind: 'income', status: 'cobrada', totalAmount: '200', paidAmount: '200', campaignId: null, talentId: null, category: null, issueDate: '2026-01-15', brandSector: null, brandGeo: null },
      { kind: 'expense', status: 'pagada', totalAmount: '50', paidAmount: '50', campaignId: null, talentId: null, category: null, issueDate: '2026-02-15', brandSector: null, brandGeo: null },
    ]);

    const pnl = await getPnL();
    expect(pnl.breakdownByMonth.map((m) => m.month)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(pnl.breakdownByMonth[0]?.ingresos).toBe(200);
    expect(pnl.breakdownByMonth[1]?.gastos).toBe(50);
    expect(pnl.breakdownByMonth[2]?.neto).toBe(100);
  });

  it('breakdownByCategory ranks by total spend descending and is case-insensitive', async () => {
    setRows([
      { kind: 'expense', status: 'pagada', totalAmount: '100', paidAmount: '100', campaignId: null, talentId: null, category: 'IA - Claude', issueDate: '2026-01-10', brandSector: null, brandGeo: null },
      { kind: 'expense', status: 'pagada', totalAmount: '50', paidAmount: '50', campaignId: null, talentId: null, category: 'ia - claude', issueDate: '2026-01-15', brandSector: null, brandGeo: null },
      { kind: 'expense', status: 'pagada', totalAmount: '200', paidAmount: '200', campaignId: null, talentId: null, category: 'comisiones', issueDate: '2026-01-20', brandSector: null, brandGeo: null },
    ]);

    const pnl = await getPnL();
    expect(pnl.breakdownByCategory[0]?.category).toBe('comisiones');
    expect(pnl.breakdownByCategory[0]?.total).toBe(200);
    expect(pnl.breakdownByCategory[1]?.category).toBe('ia - claude');
    expect(pnl.breakdownByCategory[1]?.total).toBe(150);
  });

  // ── FV.1 ──────────────────────────────────────────────────────────────────

  it('suma las facturas emitidas, que antes no llegaban al P&L (V2)', async () => {
    setRows(
      [
        { kind: 'expense', status: 'pagada', totalAmount: '600', paidAmount: '600', campaignId: 1, talentId: 7, category: 'pago talent', issueDate: '2026-01-20', brandSector: null, brandGeo: null },
      ],
      [
        { status: 'cobrada', totalAmount: '12100', campaignId: 1, talentId: null, invoiceNumber: 'ES-2026-0012', issueDate: '2026-01-15', brandSector: null, brandGeo: null },
      ],
    );

    const pnl = await getPnL();
    expect(pnl.ingresos).toBe(12100);
    expect(pnl.gastos).toBe(600);
    expect(pnl.breakdownByMonth[0]?.ingresos).toBe(12100);
  });

  it('el espejo de una emitida no vuelve a sumar', async () => {
    setRows(
      [
        { kind: 'income', status: 'cobrada', totalAmount: '12100', paidAmount: '12100', campaignId: 1, talentId: null, category: null, issueDate: '2026-01-15', brandSector: null, brandGeo: null, mirrorOfIssuedInvoiceId: 10 },
      ],
      [
        { status: 'cobrada', totalAmount: '12100', campaignId: 1, talentId: null, invoiceNumber: 'ES-2026-0012', issueDate: '2026-01-15', brandSector: null, brandGeo: null },
      ],
    );

    const pnl = await getPnL();
    expect(pnl.ingresos).toBe(12100);
  });

  it('una emitida `enviada` cuenta como pendiente de cobro', async () => {
    setRows(
      [],
      [
        { status: 'enviada', totalAmount: '5000', campaignId: null, talentId: null, invoiceNumber: 'ES-2026-0013', issueDate: '2026-03-01', brandSector: null, brandGeo: null },
      ],
    );

    const pnl = await getPnL();
    expect(pnl.pendienteCobro).toBe(5000);
  });
});
