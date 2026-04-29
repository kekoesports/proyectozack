import {
  invoiceDraftSchema,
  approveImportSchema,
  draftToInvoiceInsert,
  INVOICE_DRAFT_SOURCES,
} from '@/lib/schemas/invoiceDraft';
import type { ApproveImportInput } from '@/lib/schemas/invoiceDraft';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const minimalDraft = {
  source: 'manual' as const,
  kind: 'income' as const,
  concept: 'Servicio de consultoría',
  netAmount: '1000.00',
  totalAmount: '1210.00',
};

const fullDraft = {
  source: 'xlsx' as const,
  kind: 'expense' as const,
  concept: 'Campaña publicitaria Q1',
  netAmount: '5000.00',
  totalAmount: '6050.00',
  number: 'INV-2024-001',
  issueDate: '2024-01-15',
  dueDate: '2024-02-15',
  paidDate: '2024-01-20',
  brandId: 42,
  talentId: 7,
  counterpartyName: 'Acme Corp SL',
  issuerNif: 'B12345678',
  issuerName: 'Proveedor SA',
  category: 'Marketing',
  vatPct: '21.00',
  withholdingPct: '15.00',
  currency: 'EUR',
  series: 'B',
  status: 'emitida' as const,
  notes: 'Pago pendiente de confirmación',
};

const minimalApprove = {
  ...minimalDraft,
  id: 1,
  issueDate: '2024-03-01',
};

// ── invoiceDraftSchema ────────────────────────────────────────────────────────

describe('invoiceDraft schemas', () => {
  describe('invoiceDraftSchema', () => {
    it('accepts a valid minimal draft (only required fields)', () => {
      const result = invoiceDraftSchema.safeParse(minimalDraft);
      expect(result.success).toBe(true);
    });

    it('accepts a valid full draft (all fields)', () => {
      const result = invoiceDraftSchema.safeParse(fullDraft);
      expect(result.success).toBe(true);
    });

    it('rejects when source is missing', () => {
      const { source: _s, ...rest } = minimalDraft;
      const result = invoiceDraftSchema.safeParse(rest);
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path[0]);
        expect(paths).toContain('source');
      }
    });

    it('rejects when kind is missing', () => {
      const { kind: _k, ...rest } = minimalDraft;
      const result = invoiceDraftSchema.safeParse(rest);
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path[0]);
        expect(paths).toContain('kind');
      }
    });

    it('rejects when concept is missing', () => {
      const { concept: _c, ...rest } = minimalDraft;
      const result = invoiceDraftSchema.safeParse(rest);
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path[0]);
        expect(paths).toContain('concept');
      }
    });

    it('rejects when netAmount is missing', () => {
      const { netAmount: _n, ...rest } = minimalDraft;
      const result = invoiceDraftSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('rejects when totalAmount is missing', () => {
      const { totalAmount: _t, ...rest } = minimalDraft;
      const result = invoiceDraftSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('passes when all optional fields are absent', () => {
      // minimalDraft has only required fields — optional fields absent → passes
      const result = invoiceDraftSchema.safeParse(minimalDraft);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.issueDate).toBeUndefined();
        expect(result.data.dueDate).toBeUndefined();
        expect(result.data.counterpartyName).toBeUndefined();
        expect(result.data.brandId).toBeUndefined();
        expect(result.data.talentId).toBeUndefined();
        expect(result.data.notes).toBeUndefined();
      }
    });

    it('applies default currency EUR when absent', () => {
      const result = invoiceDraftSchema.safeParse(minimalDraft);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.currency).toBe('EUR');
    });

    it('applies default series A when absent', () => {
      const result = invoiceDraftSchema.safeParse(minimalDraft);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.series).toBe('A');
    });

    it('applies default status borrador when absent', () => {
      const result = invoiceDraftSchema.safeParse(minimalDraft);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.status).toBe('borrador');
    });

    describe('source field', () => {
      it.each(INVOICE_DRAFT_SOURCES)('accepts valid source "%s"', (source) => {
        const result = invoiceDraftSchema.safeParse({ ...minimalDraft, source });
        expect(result.success).toBe(true);
      });

      it('rejects an invalid source value', () => {
        const result = invoiceDraftSchema.safeParse({ ...minimalDraft, source: 'ftp-upload' });
        expect(result.success).toBe(false);
        if (!result.success) {
          const paths = result.error.issues.map((i) => i.path[0]);
          expect(paths).toContain('source');
        }
      });
    });

    describe('kind field', () => {
      it('accepts "income"', () => {
        expect(invoiceDraftSchema.safeParse({ ...minimalDraft, kind: 'income' }).success).toBe(true);
      });

      it('accepts "expense"', () => {
        expect(invoiceDraftSchema.safeParse({ ...minimalDraft, kind: 'expense' }).success).toBe(true);
      });

      it('rejects an invalid kind', () => {
        expect(invoiceDraftSchema.safeParse({ ...minimalDraft, kind: 'refund' }).success).toBe(false);
      });
    });

    describe('moneyStr fields', () => {
      it('accepts numeric netAmount and coerces to string', () => {
        const result = invoiceDraftSchema.safeParse({ ...minimalDraft, netAmount: 1000 });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.netAmount).toBe('1000.00');
      });

      it('accepts comma-decimal netAmount and normalises to dot', () => {
        const result = invoiceDraftSchema.safeParse({ ...minimalDraft, netAmount: '1000,50' });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.netAmount).toBe('1000.50');
      });

      it('rejects non-numeric netAmount', () => {
        expect(invoiceDraftSchema.safeParse({ ...minimalDraft, netAmount: 'abc' }).success).toBe(false);
      });
    });

    describe('optDate fields', () => {
      it('accepts a valid YYYY-MM-DD issueDate', () => {
        const result = invoiceDraftSchema.safeParse({ ...minimalDraft, issueDate: '2024-06-01' });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.issueDate).toBe('2024-06-01');
      });

      it('rejects an invalid date format for issueDate', () => {
        expect(invoiceDraftSchema.safeParse({ ...minimalDraft, issueDate: '01/06/2024' }).success).toBe(false);
      });

      it('treats empty string issueDate as undefined (optional)', () => {
        const result = invoiceDraftSchema.safeParse({ ...minimalDraft, issueDate: '' });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.issueDate).toBeUndefined();
      });
    });
  });

  // ── approveImportSchema ─────────────────────────────────────────────────────

  describe('approveImportSchema', () => {
    it('accepts a valid minimal approve payload', () => {
      const result = approveImportSchema.safeParse(minimalApprove);
      expect(result.success).toBe(true);
    });

    it('rejects when issueDate is missing (mandatory in approveImportSchema)', () => {
      const { issueDate: _d, ...rest } = minimalApprove;
      const result = approveImportSchema.safeParse(rest);
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path[0]);
        expect(paths).toContain('issueDate');
      }
    });

    it('rejects when id is missing', () => {
      const { id: _id, ...rest } = minimalApprove;
      const result = approveImportSchema.safeParse(rest);
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path[0]);
        expect(paths).toContain('id');
      }
    });

    it('accepts a valid YYYY-MM-DD issueDate', () => {
      const result = approveImportSchema.safeParse({ ...minimalApprove, issueDate: '2024-12-31' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.issueDate).toBe('2024-12-31');
    });

    it('rejects an invalid issueDate format', () => {
      const result = approveImportSchema.safeParse({ ...minimalApprove, issueDate: '31-12-2024' });
      expect(result.success).toBe(false);
    });

    it('defaults vatPct to "21.00" when absent', () => {
      const result = approveImportSchema.safeParse(minimalApprove);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.vatPct).toBe('21.00');
    });

    it('defaults withholdingPct to "0.00" when absent', () => {
      const result = approveImportSchema.safeParse(minimalApprove);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.withholdingPct).toBe('0.00');
    });

    it('accepts explicit vatPct overriding the default', () => {
      const result = approveImportSchema.safeParse({ ...minimalApprove, vatPct: '10.00' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.vatPct).toBe('10.00');
    });

    it('accepts explicit withholdingPct overriding the default', () => {
      const result = approveImportSchema.safeParse({ ...minimalApprove, withholdingPct: '15.00' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.withholdingPct).toBe('15.00');
    });

    it('coerces string id to number', () => {
      const result = approveImportSchema.safeParse({ ...minimalApprove, id: '99' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.id).toBe(99);
    });

    it('rejects a non-positive id', () => {
      expect(approveImportSchema.safeParse({ ...minimalApprove, id: 0 }).success).toBe(false);
      expect(approveImportSchema.safeParse({ ...minimalApprove, id: -1 }).success).toBe(false);
    });
  });

  // ── draftToInvoiceInsert ────────────────────────────────────────────────────

  describe('draftToInvoiceInsert', () => {
    function buildApproved(overrides: Partial<ApproveImportInput> = {}): ApproveImportInput {
      const base = approveImportSchema.safeParse({ ...minimalApprove, ...overrides });
      if (!base.success) throw new Error('Fixture parse failed: ' + JSON.stringify(base.error.issues));
      return base.data;
    }

    it('maps counterpartyName directly when present', () => {
      const input = buildApproved({ counterpartyName: 'Acme Corp' });
      const result = draftToInvoiceInsert(input, null);
      expect(result.counterpartyName).toBe('Acme Corp');
    });

    it('falls back to issuerName when counterpartyName is absent', () => {
      const input = buildApproved({ issuerName: 'Proveedor SA' });
      // counterpartyName not set → undefined → falls back to issuerName
      const result = draftToInvoiceInsert(input, null);
      expect(result.counterpartyName).toBe('Proveedor SA');
    });

    it('returns null for counterpartyName when both counterpartyName and issuerName are absent', () => {
      const input = buildApproved();
      // Neither counterpartyName nor issuerName provided
      const result = draftToInvoiceInsert(input, null);
      expect(result.counterpartyName).toBeNull();
    });

    it('prefers counterpartyName over issuerName when both are present', () => {
      const input = buildApproved({ counterpartyName: 'Client Corp', issuerName: 'Issuer SA' });
      const result = draftToInvoiceInsert(input, null);
      expect(result.counterpartyName).toBe('Client Corp');
    });

    it('maps createdByUserId string to output', () => {
      const input = buildApproved();
      const result = draftToInvoiceInsert(input, 'user-abc-123');
      expect(result.createdByUserId).toBe('user-abc-123');
    });

    it('maps createdByUserId null to null in output', () => {
      const input = buildApproved();
      const result = draftToInvoiceInsert(input, null);
      expect(result.createdByUserId).toBeNull();
    });

    it('maps concept correctly', () => {
      const input = buildApproved({ concept: 'Servicio de diseño' });
      const result = draftToInvoiceInsert(input, null);
      expect(result.concept).toBe('Servicio de diseño');
    });

    it('maps netAmount correctly', () => {
      const input = buildApproved({ netAmount: '2500.00' });
      const result = draftToInvoiceInsert(input, null);
      expect(result.netAmount).toBe('2500.00');
    });

    it('maps totalAmount correctly', () => {
      const input = buildApproved({ totalAmount: '3025.00' });
      const result = draftToInvoiceInsert(input, null);
      expect(result.totalAmount).toBe('3025.00');
    });

    it('maps issueDate correctly', () => {
      const input = buildApproved({ issueDate: '2024-07-04' });
      const result = draftToInvoiceInsert(input, null);
      expect(result.issueDate).toBe('2024-07-04');
    });

    it('maps vatPct correctly (default 21.00)', () => {
      const input = buildApproved();
      const result = draftToInvoiceInsert(input, null);
      expect(result.vatPct).toBe('21.00');
    });

    it('maps withholdingPct correctly (default 0.00)', () => {
      const input = buildApproved();
      const result = draftToInvoiceInsert(input, null);
      expect(result.withholdingPct).toBe('0.00');
    });

    it('maps kind correctly', () => {
      const input = buildApproved({ kind: 'expense' });
      const result = draftToInvoiceInsert(input, null);
      expect(result.kind).toBe('expense');
    });

    it('maps status correctly (default borrador)', () => {
      const input = buildApproved();
      const result = draftToInvoiceInsert(input, null);
      expect(result.status).toBe('borrador');
    });

    it('maps optional number to null when absent', () => {
      const input = buildApproved();
      const result = draftToInvoiceInsert(input, null);
      expect(result.number).toBeNull();
    });

    it('maps number when present', () => {
      const input = buildApproved({ number: 'INV-001' });
      const result = draftToInvoiceInsert(input, null);
      expect(result.number).toBe('INV-001');
    });

    it('maps dueDate to null when absent', () => {
      const input = buildApproved();
      const result = draftToInvoiceInsert(input, null);
      expect(result.dueDate).toBeNull();
    });

    it('maps dueDate when present', () => {
      const input = buildApproved({ dueDate: '2024-04-01' });
      const result = draftToInvoiceInsert(input, null);
      expect(result.dueDate).toBe('2024-04-01');
    });

    it('maps paidDate to null when absent', () => {
      const input = buildApproved();
      const result = draftToInvoiceInsert(input, null);
      expect(result.paidDate).toBeNull();
    });

    it('maps brandId to null when absent', () => {
      const input = buildApproved();
      const result = draftToInvoiceInsert(input, null);
      expect(result.brandId).toBeNull();
    });

    it('maps brandId when present', () => {
      const input = buildApproved({ brandId: 5 });
      const result = draftToInvoiceInsert(input, null);
      expect(result.brandId).toBe(5);
    });

    it('maps talentId to null when absent', () => {
      const input = buildApproved();
      const result = draftToInvoiceInsert(input, null);
      expect(result.talentId).toBeNull();
    });

    it('maps category to null when absent', () => {
      const input = buildApproved();
      const result = draftToInvoiceInsert(input, null);
      expect(result.category).toBeNull();
    });

    it('maps category when present', () => {
      const input = buildApproved({ category: 'Marketing' });
      const result = draftToInvoiceInsert(input, null);
      expect(result.category).toBe('Marketing');
    });

    it('maps notes to null when absent', () => {
      const input = buildApproved();
      const result = draftToInvoiceInsert(input, null);
      expect(result.notes).toBeNull();
    });

    it('maps notes when present', () => {
      const input = buildApproved({ notes: 'Revisión pendiente' });
      const result = draftToInvoiceInsert(input, null);
      expect(result.notes).toBe('Revisión pendiente');
    });

    it('maps currency correctly (default EUR)', () => {
      const input = buildApproved();
      const result = draftToInvoiceInsert(input, null);
      expect(result.currency).toBe('EUR');
    });

    it('maps series correctly (default A)', () => {
      const input = buildApproved();
      const result = draftToInvoiceInsert(input, null);
      expect(result.series).toBe('A');
    });

    it('output shape contains all expected NewInvoice keys', () => {
      const input = buildApproved();
      const result = draftToInvoiceInsert(input, 'user-1');
      const expectedKeys: Array<keyof typeof result> = [
        'kind',
        'number',
        'issueDate',
        'dueDate',
        'paidDate',
        'brandId',
        'talentId',
        'counterpartyName',
        'concept',
        'category',
        'netAmount',
        'vatPct',
        'withholdingPct',
        'totalAmount',
        'currency',
        'series',
        'status',
        'notes',
        'createdByUserId',
      ];
      for (const key of expectedKeys) {
        expect(result).toHaveProperty(key);
      }
    });
  });
});
