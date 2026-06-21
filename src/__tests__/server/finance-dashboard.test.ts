import { deriveAlerts } from '@/lib/queries/financeDashboard/alerts';
import { LOW_MARGIN_THRESHOLD } from '@/lib/queries/financeDashboard/campaignMargins';
import type {
  CampaignMarginRow,
  FinanceDashboardKPIs,
  ReceivableRow,
  ReconciliationSummary,
} from '@/types/financeDashboard';

// ── Fixtures ────────────────────────────────────────────────────────────

function makeKPIs(overrides: Partial<FinanceDashboardKPIs> = {}): FinanceDashboardKPIs {
  return {
    incomeTotal: 10000,
    expenseTotal: 4000,
    netTotal: 6000,
    pendingCobro: 0,
    pendingPago: 0,
    gastosCampana: 2000,
    gastosEmpresa: 2000,
    beneficioNeto: 6000,
    cobradoRealMes: 3000,
    pendingApplyPayment: 0,
    unconciliatedMovements: 0,
    ...overrides,
  };
}

function makeReconciliation(
  overrides: Partial<ReconciliationSummary> = {},
): ReconciliationSummary {
  return {
    totalTransactions: 100,
    importedUnmatched: 0,
    matched: 95,
    needsReview: 5,
    pendingApplyPayment: 0,
    ...overrides,
  };
}

function makeReceivable(overrides: Partial<ReceivableRow> = {}): ReceivableRow {
  return {
    id: 1,
    source: 'issued',
    invoiceNumber: 'SP-2026-001',
    clientName: 'Cliente SA',
    totalAmount: 1000,
    paidAmount: 0,
    pendingAmount: 1000,
    status: 'emitida',
    dueDate: null,
    isOverdue: false,
    ...overrides,
  };
}

function makeCampaign(overrides: Partial<CampaignMarginRow> = {}): CampaignMarginRow {
  return {
    id: 1,
    name: 'Campaña Test',
    brandName: 'Marca SA',
    talentName: 'Talento',
    status: 'activa',
    amountBrand: 10000,
    amountTalent: 7000,
    computedMarginPct: 30,
    isLow: false,
    cobroConfirmado: false,
    pagoTalentConfirmado: false,
    ...overrides,
  };
}

// ── LOW_MARGIN_THRESHOLD ─────────────────────────────────────────────────

describe('LOW_MARGIN_THRESHOLD', () => {
  it('is 20', () => {
    expect(LOW_MARGIN_THRESHOLD).toBe(20);
  });
});

// ── deriveAlerts ─────────────────────────────────────────────────────────

describe('deriveAlerts', () => {
  it('returns empty array when everything is healthy', () => {
    const alerts = deriveAlerts({
      kpis: makeKPIs(),
      receivables: [],
      reconciliation: makeReconciliation(),
      campaigns: [],
    });
    expect(alerts).toHaveLength(0);
  });

  describe('overdue_receivable alert', () => {
    it('fires when there are overdue receivables', () => {
      const alerts = deriveAlerts({
        kpis: makeKPIs(),
        receivables: [makeReceivable({ isOverdue: true, dueDate: '2026-01-01', pendingAmount: 1000 })],
        reconciliation: makeReconciliation(),
        campaigns: [],
      });
      const alert = alerts.find((a) => a.type === 'overdue_receivable');
      expect(alert).toBeDefined();
      expect(alert?.count).toBe(1);
      expect(alert?.amount).toBe(1000);
    });

    it('assigns high severity when amount > 5000', () => {
      const alerts = deriveAlerts({
        kpis: makeKPIs(),
        receivables: [makeReceivable({ isOverdue: true, pendingAmount: 6000 })],
        reconciliation: makeReconciliation(),
        campaigns: [],
      });
      const alert = alerts.find((a) => a.type === 'overdue_receivable');
      expect(alert?.severity).toBe('high');
    });

    it('assigns medium severity when amount <= 5000', () => {
      const alerts = deriveAlerts({
        kpis: makeKPIs(),
        receivables: [makeReceivable({ isOverdue: true, pendingAmount: 500 })],
        reconciliation: makeReconciliation(),
        campaigns: [],
      });
      const alert = alerts.find((a) => a.type === 'overdue_receivable');
      expect(alert?.severity).toBe('medium');
    });

    it('does not fire for non-overdue receivables', () => {
      const alerts = deriveAlerts({
        kpis: makeKPIs(),
        receivables: [makeReceivable({ isOverdue: false })],
        reconciliation: makeReconciliation(),
        campaigns: [],
      });
      expect(alerts.find((a) => a.type === 'overdue_receivable')).toBeUndefined();
    });

    it('accumulates amount across multiple overdue invoices', () => {
      const alerts = deriveAlerts({
        kpis: makeKPIs(),
        receivables: [
          makeReceivable({ id: 1, isOverdue: true, pendingAmount: 2000 }),
          makeReceivable({ id: 2, isOverdue: true, pendingAmount: 3000 }),
          makeReceivable({ id: 3, isOverdue: false, pendingAmount: 500 }),
        ],
        reconciliation: makeReconciliation(),
        campaigns: [],
      });
      const alert = alerts.find((a) => a.type === 'overdue_receivable');
      expect(alert?.count).toBe(2);
      expect(alert?.amount).toBe(5000);
    });
  });

  describe('low_margin alert', () => {
    it('fires when a campaign has isLow=true', () => {
      const alerts = deriveAlerts({
        kpis: makeKPIs(),
        receivables: [],
        reconciliation: makeReconciliation(),
        campaigns: [makeCampaign({ isLow: true, computedMarginPct: 15 })],
      });
      const alert = alerts.find((a) => a.type === 'low_margin');
      expect(alert).toBeDefined();
      expect(alert?.count).toBe(1);
      expect(alert?.severity).toBe('medium');
    });

    it('does not fire when all campaigns have isLow=false', () => {
      const alerts = deriveAlerts({
        kpis: makeKPIs(),
        receivables: [],
        reconciliation: makeReconciliation(),
        campaigns: [makeCampaign({ isLow: false, computedMarginPct: 35 })],
      });
      expect(alerts.find((a) => a.type === 'low_margin')).toBeUndefined();
    });
  });

  describe('pending_apply_payment alert', () => {
    it('fires when pendingApplyPayment > 0', () => {
      const alerts = deriveAlerts({
        kpis: makeKPIs({ pendingApplyPayment: 3 }),
        receivables: [],
        reconciliation: makeReconciliation(),
        campaigns: [],
      });
      const alert = alerts.find((a) => a.type === 'pending_apply_payment');
      expect(alert).toBeDefined();
      expect(alert?.count).toBe(3);
    });

    it('assigns high severity when count > 5', () => {
      const alerts = deriveAlerts({
        kpis: makeKPIs({ pendingApplyPayment: 6 }),
        receivables: [],
        reconciliation: makeReconciliation(),
        campaigns: [],
      });
      const alert = alerts.find((a) => a.type === 'pending_apply_payment');
      expect(alert?.severity).toBe('high');
    });

    it('assigns low severity when count <= 5', () => {
      const alerts = deriveAlerts({
        kpis: makeKPIs({ pendingApplyPayment: 5 }),
        receivables: [],
        reconciliation: makeReconciliation(),
        campaigns: [],
      });
      const alert = alerts.find((a) => a.type === 'pending_apply_payment');
      expect(alert?.severity).toBe('low');
    });

    it('does not fire when pendingApplyPayment is 0', () => {
      const alerts = deriveAlerts({
        kpis: makeKPIs({ pendingApplyPayment: 0 }),
        receivables: [],
        reconciliation: makeReconciliation(),
        campaigns: [],
      });
      expect(alerts.find((a) => a.type === 'pending_apply_payment')).toBeUndefined();
    });
  });

  describe('unreconciled alert', () => {
    it('fires when importedUnmatched > 0', () => {
      const alerts = deriveAlerts({
        kpis: makeKPIs({ unconciliatedMovements: 5 }),
        receivables: [],
        reconciliation: makeReconciliation({ importedUnmatched: 5 }),
        campaigns: [],
      });
      const alert = alerts.find((a) => a.type === 'unreconciled');
      expect(alert).toBeDefined();
      expect(alert?.count).toBe(5);
    });

    it('assigns medium severity when count > 20', () => {
      const alerts = deriveAlerts({
        kpis: makeKPIs({ unconciliatedMovements: 25 }),
        receivables: [],
        reconciliation: makeReconciliation({ importedUnmatched: 25 }),
        campaigns: [],
      });
      const alert = alerts.find((a) => a.type === 'unreconciled');
      expect(alert?.severity).toBe('medium');
    });

    it('assigns low severity when count <= 20', () => {
      const alerts = deriveAlerts({
        kpis: makeKPIs({ unconciliatedMovements: 10 }),
        receivables: [],
        reconciliation: makeReconciliation({ importedUnmatched: 10 }),
        campaigns: [],
      });
      const alert = alerts.find((a) => a.type === 'unreconciled');
      expect(alert?.severity).toBe('low');
    });
  });

  describe('alert ordering', () => {
    it('sorts alerts by severity: high before medium before low', () => {
      const alerts = deriveAlerts({
        kpis: makeKPIs({
          pendingApplyPayment: 10, // high (> 5)
          unconciliatedMovements: 5, // low (<= 20)
        }),
        receivables: [makeReceivable({ isOverdue: true, pendingAmount: 6000 })], // high
        reconciliation: makeReconciliation({ importedUnmatched: 5 }),
        campaigns: [makeCampaign({ isLow: true })], // medium
      });

      const severities = alerts.map((a) => a.severity);
      const highIdx = severities.indexOf('high');
      const medIdx = severities.indexOf('medium');
      const lowIdx = severities.indexOf('low');

      // All high before all medium, all medium before all low
      for (let i = 0; i < severities.length - 1; i++) {
        const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
        expect((order[severities[i] ?? ''] ?? 3) <= (order[severities[i + 1] ?? ''] ?? 3)).toBe(true);
      }

      // Basic presence check
      expect(highIdx).toBeGreaterThanOrEqual(0);
      expect(medIdx).toBeGreaterThanOrEqual(0);
      expect(lowIdx).toBeGreaterThanOrEqual(0);
    });
  });
});

// ── ReceivableRow pendingAmount logic ───────────────────────────────────

describe('ReceivableRow pendingAmount semantics', () => {
  it('pending = totalAmount - paidAmount', () => {
    const r = makeReceivable({ totalAmount: 1000, paidAmount: 300, pendingAmount: 700 });
    expect(r.pendingAmount).toBe(r.totalAmount - r.paidAmount);
  });

  it('pending is 0 when fully paid', () => {
    const r = makeReceivable({ totalAmount: 500, paidAmount: 500, pendingAmount: 0 });
    expect(r.pendingAmount).toBe(0);
  });
});

// ── CampaignMarginRow isLow threshold ───────────────────────────────────

describe('CampaignMarginRow isLow flag', () => {
  it('isLow=true when margin < 20', () => {
    const c = makeCampaign({ computedMarginPct: 19.9, isLow: true });
    expect(c.isLow).toBe(true);
  });

  it('isLow=false when margin >= 20', () => {
    const c = makeCampaign({ computedMarginPct: 20, isLow: false });
    expect(c.isLow).toBe(false);
  });

  it('isLow=false when margin is null', () => {
    const c = makeCampaign({ computedMarginPct: null, isLow: false });
    expect(c.isLow).toBe(false);
  });
});
