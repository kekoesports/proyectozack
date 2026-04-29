import {
  createInvoiceSchema,
  updateInvoiceSchema,
  looksLikeAiCategory,
  INVOICE_KINDS,
  INVOICE_STATUSES,
  INVOICE_COMPANIES,
  INVOICE_PAYMENT_METHODS,
  INVOICE_AI_TOOLS,
} from '@/lib/schemas/invoice';

// ── Minimal valid payload for createInvoiceSchema ──────────────────────────
const validCreate = {
  kind: 'income',
  issueDate: '2026-04-15',
  concept: 'Servicios de diseño',
  netAmount: '1000.00',
  totalAmount: '1210.00',
};

// ── Helpers ────────────────────────────────────────────────────────────────
function parse(data: unknown) {
  return createInvoiceSchema.safeParse(data);
}

function parseUpdate(data: unknown) {
  return updateInvoiceSchema.safeParse(data);
}

// ══════════════════════════════════════════════════════════════════════════
describe('invoice schemas', () => {
  // ── looksLikeAiCategory ─────────────────────────────────────────────────
  describe('looksLikeAiCategory', () => {
    it('returns false for null', () => {
      expect(looksLikeAiCategory(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(looksLikeAiCategory(undefined)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(looksLikeAiCategory('')).toBe(false);
    });

    it('returns true for a string containing "ChatGPT"', () => {
      expect(looksLikeAiCategory('ChatGPT service')).toBe(true);
    });

    it('returns true for a string containing "IA" (Spanish abbreviation)', () => {
      expect(looksLikeAiCategory('IA herramienta')).toBe(true);
    });

    it('returns true for a string containing "ai" (lowercase)', () => {
      expect(looksLikeAiCategory('ai tools')).toBe(true);
    });

    it('returns true for a string containing "claude"', () => {
      expect(looksLikeAiCategory('Factura claude')).toBe(true);
    });

    it('returns true for a string containing "gemini"', () => {
      expect(looksLikeAiCategory('gemini subscription')).toBe(true);
    });

    it('returns true for a string containing "midjourney"', () => {
      expect(looksLikeAiCategory('midjourney plan')).toBe(true);
    });

    it('returns true for a string containing "copilot"', () => {
      expect(looksLikeAiCategory('GitHub copilot')).toBe(true);
    });

    it('returns false for a normal category like "Diseño"', () => {
      expect(looksLikeAiCategory('Diseño')).toBe(false);
    });

    it('returns false for "rain" — contains "ai" but not at a word boundary', () => {
      // The regex uses \b word boundaries: "rain" has 'ai' embedded mid-word
      // so it must NOT match.
      expect(looksLikeAiCategory('rain')).toBe(false);
    });

    it('returns false for "paid" — embedded "ai" mid-word', () => {
      expect(looksLikeAiCategory('paid invoice')).toBe(false);
    });
  });

  // ── moneyStr preprocessor ───────────────────────────────────────────────
  describe('createInvoiceSchema — moneyStr preprocessor', () => {
    it('coerces number 21 to "21.00" and passes', () => {
      const result = parse({ ...validCreate, netAmount: 21, totalAmount: '21.00' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.netAmount).toBe('21.00');
    });

    it('accepts string "100.50"', () => {
      const result = parse({ ...validCreate, netAmount: '100.50', totalAmount: '100.50' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.netAmount).toBe('100.50');
    });

    it('replaces comma with dot: "100,50" → "100.50" and passes', () => {
      const result = parse({ ...validCreate, netAmount: '100,50', totalAmount: '100.50' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.netAmount).toBe('100.50');
    });

    it('accepts string "0" (zero is valid)', () => {
      const result = parse({ ...validCreate, netAmount: '0', totalAmount: '0' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.netAmount).toBe('0');
    });

    it('rejects string "-100" (negative not allowed by regex)', () => {
      const result = parse({ ...validCreate, netAmount: '-100', totalAmount: '0' });
      expect(result.success).toBe(false);
    });

    it('rejects string "abc"', () => {
      const result = parse({ ...validCreate, netAmount: 'abc', totalAmount: '0' });
      expect(result.success).toBe(false);
    });

    it('"1,234.56" → replace first comma → "1.234.56" → fails regex (two dots)', () => {
      // String.replace(',', '.') only replaces the FIRST comma.
      // "1,234.56" becomes "1.234.56" which has two dots → fails /^\d+(\.\d{1,2})?$/.
      const result = parse({ ...validCreate, netAmount: '1,234.56', totalAmount: '0' });
      expect(result.success).toBe(false);
    });

    it('accepts integer string "500"', () => {
      const result = parse({ ...validCreate, netAmount: '500', totalAmount: '500' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.netAmount).toBe('500');
    });

    it('rejects more than 2 decimal places "100.123"', () => {
      const result = parse({ ...validCreate, netAmount: '100.123', totalAmount: '0' });
      expect(result.success).toBe(false);
    });
  });

  // ── optStr preprocessor ─────────────────────────────────────────────────
  describe('createInvoiceSchema — optStr preprocessor', () => {
    it('empty string "" becomes undefined (field absent)', () => {
      const result = parse({ ...validCreate, number: '' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.number).toBeUndefined();
    });

    it('non-empty string passes through as string', () => {
      const result = parse({ ...validCreate, number: 'INV-001' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.number).toBe('INV-001');
    });

    it('undefined stays undefined', () => {
      const result = parse({ ...validCreate, number: undefined });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.number).toBeUndefined();
    });

    it('whitespace-only string becomes undefined', () => {
      const result = parse({ ...validCreate, number: '   ' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.number).toBeUndefined();
    });

    it('rejects a string exceeding max length (counterpartyName max 200)', () => {
      const result = parse({ ...validCreate, counterpartyName: 'x'.repeat(201) });
      expect(result.success).toBe(false);
    });
  });

  // ── optDate preprocessor ────────────────────────────────────────────────
  describe('createInvoiceSchema — optDate preprocessor', () => {
    it('empty string "" becomes undefined', () => {
      const result = parse({ ...validCreate, dueDate: '' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.dueDate).toBeUndefined();
    });

    it('valid date "2026-04-15" passes', () => {
      const result = parse({ ...validCreate, dueDate: '2026-04-15' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.dueDate).toBe('2026-04-15');
    });

    it('invalid format "15/04/2026" fails (regex requires YYYY-MM-DD)', () => {
      const result = parse({ ...validCreate, dueDate: '15/04/2026' });
      expect(result.success).toBe(false);
    });

    it('undefined stays undefined', () => {
      const result = parse({ ...validCreate, dueDate: undefined });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.dueDate).toBeUndefined();
    });

    it('invalid date string "2026-13-01" fails (month 13 fails regex loosely but passes format — regex only checks pattern)', () => {
      // The regex /^\d{4}-\d{2}-\d{2}$/ only validates the pattern, not calendar validity.
      // "2026-13-01" matches the pattern so it passes.
      const result = parse({ ...validCreate, dueDate: '2026-13-01' });
      expect(result.success).toBe(true);
    });

    it('paidDate also uses optDate: empty string → undefined', () => {
      const result = parse({ ...validCreate, paidDate: '' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.paidDate).toBeUndefined();
    });
  });

  // ── optInt preprocessor ─────────────────────────────────────────────────
  describe('createInvoiceSchema — optInt preprocessor', () => {
    it('"" → undefined (field absent)', () => {
      const result = parse({ ...validCreate, brandId: '' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.brandId).toBeUndefined();
    });

    it('null → undefined', () => {
      const result = parse({ ...validCreate, brandId: null });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.brandId).toBeUndefined();
    });

    it('"21" → 21 (positive integer passes)', () => {
      const result = parse({ ...validCreate, brandId: '21' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.brandId).toBe(21);
    });

    it('"0" → fails (must be positive, not zero)', () => {
      const result = parse({ ...validCreate, brandId: '0' });
      expect(result.success).toBe(false);
    });

    it('"-1" → fails (negative not positive)', () => {
      const result = parse({ ...validCreate, brandId: '-1' });
      expect(result.success).toBe(false);
    });

    it('"21.5" → fails (not an integer)', () => {
      const result = parse({ ...validCreate, brandId: '21.5' });
      expect(result.success).toBe(false);
    });

    it('numeric 5 → 5 (already a number, passes)', () => {
      const result = parse({ ...validCreate, talentId: 5 });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.talentId).toBe(5);
    });

    it('undefined → undefined', () => {
      const result = parse({ ...validCreate, campaignId: undefined });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.campaignId).toBeUndefined();
    });
  });

  // ── optEnum preprocessor ────────────────────────────────────────────────
  describe('createInvoiceSchema — optEnum preprocessor', () => {
    it('empty string "" → undefined for company field', () => {
      const result = parse({ ...validCreate, company: '' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.company).toBeUndefined();
    });

    it('valid company value "spain" passes', () => {
      const result = parse({ ...validCreate, company: 'spain' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.company).toBe('spain');
    });

    it('invalid company value "usa" fails', () => {
      const result = parse({ ...validCreate, company: 'usa' });
      expect(result.success).toBe(false);
    });

    it('valid paymentMethod "banco" passes', () => {
      const result = parse({ ...validCreate, paymentMethod: 'banco' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.paymentMethod).toBe('banco');
    });

    it('invalid paymentMethod "cash" fails', () => {
      const result = parse({ ...validCreate, paymentMethod: 'cash' });
      expect(result.success).toBe(false);
    });

    it('valid aiTool "chatgpt" passes', () => {
      const result = parse({ ...validCreate, aiTool: 'chatgpt' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.aiTool).toBe('chatgpt');
    });

    it('invalid aiTool "grok" fails', () => {
      const result = parse({ ...validCreate, aiTool: 'grok' });
      expect(result.success).toBe(false);
    });

    it('empty string "" → undefined for paymentMethod', () => {
      const result = parse({ ...validCreate, paymentMethod: '' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.paymentMethod).toBeUndefined();
    });

    it('empty string "" → undefined for aiTool', () => {
      const result = parse({ ...validCreate, aiTool: '' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.aiTool).toBeUndefined();
    });
  });

  // ── createInvoiceSchema — full valid payload ────────────────────────────
  describe('createInvoiceSchema — full valid payload', () => {
    it('accepts a minimal valid payload', () => {
      const result = parse(validCreate);
      expect(result.success).toBe(true);
    });

    it('applies default vatPct "21.00" when not provided', () => {
      const result = parse(validCreate);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.vatPct).toBe('21.00');
    });

    it('applies default withholdingPct "0.00" when not provided', () => {
      const result = parse(validCreate);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.withholdingPct).toBe('0.00');
    });

    it('applies default currency "EUR" when not provided', () => {
      const result = parse(validCreate);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.currency).toBe('EUR');
    });

    it('applies default series "A" when not provided', () => {
      const result = parse(validCreate);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.series).toBe('A');
    });

    it('applies default status "borrador" when not provided', () => {
      const result = parse(validCreate);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.status).toBe('borrador');
    });

    it('rejects missing required field "kind"', () => {
      const { kind: _kind, ...rest } = validCreate;
      const result = parse(rest);
      expect(result.success).toBe(false);
    });

    it('rejects missing required field "issueDate"', () => {
      const { issueDate: _issueDate, ...rest } = validCreate;
      const result = parse(rest);
      expect(result.success).toBe(false);
    });

    it('rejects missing required field "concept"', () => {
      const { concept: _concept, ...rest } = validCreate;
      const result = parse(rest);
      expect(result.success).toBe(false);
    });

    it('rejects missing required field "netAmount"', () => {
      const { netAmount: _netAmount, ...rest } = validCreate;
      const result = parse(rest);
      expect(result.success).toBe(false);
    });

    it('rejects missing required field "totalAmount"', () => {
      const { totalAmount: _totalAmount, ...rest } = validCreate;
      const result = parse(rest);
      expect(result.success).toBe(false);
    });

    it('rejects invalid kind value', () => {
      const result = parse({ ...validCreate, kind: 'transfer' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid status value', () => {
      const result = parse({ ...validCreate, status: 'pending' });
      expect(result.success).toBe(false);
    });

    it('rejects issueDate in wrong format "15/04/2026"', () => {
      const result = parse({ ...validCreate, issueDate: '15/04/2026' });
      expect(result.success).toBe(false);
    });

    it('rejects empty concept (min 1 char)', () => {
      const result = parse({ ...validCreate, concept: '' });
      expect(result.success).toBe(false);
    });

    it('rejects concept exceeding 2000 chars', () => {
      const result = parse({ ...validCreate, concept: 'x'.repeat(2001) });
      expect(result.success).toBe(false);
    });

    it('accepts optional paidAmount when provided', () => {
      const result = parse({ ...validCreate, paidAmount: '500.00' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.paidAmount).toBe('500.00');
    });

    it('accepts optional notes when provided', () => {
      const result = parse({ ...validCreate, notes: 'Nota de prueba' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.notes).toBe('Nota de prueba');
    });

    it('rejects notes exceeding 5000 chars', () => {
      const result = parse({ ...validCreate, notes: 'x'.repeat(5001) });
      expect(result.success).toBe(false);
    });

    it('rejects currency not exactly 3 chars', () => {
      const result = parse({ ...validCreate, currency: 'EU' });
      expect(result.success).toBe(false);
    });

    it('rejects series exceeding 20 chars', () => {
      const result = parse({ ...validCreate, series: 'x'.repeat(21) });
      expect(result.success).toBe(false);
    });

    it('accepts all valid INVOICE_KINDS values', () => {
      for (const kind of INVOICE_KINDS) {
        const result = parse({ ...validCreate, kind });
        expect(result.success).toBe(true);
      }
    });

    it('accepts all valid INVOICE_STATUSES values', () => {
      for (const status of INVOICE_STATUSES) {
        const result = parse({ ...validCreate, status });
        expect(result.success).toBe(true);
      }
    });

    it('accepts all valid INVOICE_COMPANIES values', () => {
      for (const company of INVOICE_COMPANIES) {
        const result = parse({ ...validCreate, company });
        expect(result.success).toBe(true);
      }
    });

    it('accepts all valid INVOICE_PAYMENT_METHODS values', () => {
      for (const paymentMethod of INVOICE_PAYMENT_METHODS) {
        const result = parse({ ...validCreate, paymentMethod });
        expect(result.success).toBe(true);
      }
    });

    it('accepts all valid INVOICE_AI_TOOLS values', () => {
      for (const aiTool of INVOICE_AI_TOOLS) {
        const result = parse({ ...validCreate, aiTool });
        expect(result.success).toBe(true);
      }
    });
  });

  // ── updateInvoiceSchema ─────────────────────────────────────────────────
  describe('updateInvoiceSchema', () => {
    it('requires id field (number)', () => {
      const result = parseUpdate({ id: 42 });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.id).toBe(42);
    });

    it('fails when id is missing', () => {
      const result = parseUpdate({ kind: 'income' });
      expect(result.success).toBe(false);
    });

    it('fails when id is zero (must be positive)', () => {
      const result = parseUpdate({ id: 0 });
      expect(result.success).toBe(false);
    });

    it('fails when id is negative', () => {
      const result = parseUpdate({ id: -1 });
      expect(result.success).toBe(false);
    });

    it('coerces string id "7" to number 7', () => {
      const result = parseUpdate({ id: '7' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.id).toBe(7);
    });

    it('all other fields are optional — only id is sufficient', () => {
      const result = parseUpdate({ id: 1 });
      expect(result.success).toBe(true);
    });

    it('accepts partial update with id + kind', () => {
      const result = parseUpdate({ id: 1, kind: 'expense' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(1);
        expect(result.data.kind).toBe('expense');
      }
    });

    it('accepts partial update with id + concept', () => {
      const result = parseUpdate({ id: 5, concept: 'Nuevo concepto' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.concept).toBe('Nuevo concepto');
    });

    it('accepts partial update with id + netAmount as number', () => {
      const result = parseUpdate({ id: 3, netAmount: 500 });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.netAmount).toBe('500.00');
    });

    it('accepts full valid payload with id', () => {
      const result = parseUpdate({ id: 99, ...validCreate });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.id).toBe(99);
    });

    it('rejects invalid kind in partial update', () => {
      const result = parseUpdate({ id: 1, kind: 'transfer' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid netAmount in partial update', () => {
      const result = parseUpdate({ id: 1, netAmount: 'abc' });
      expect(result.success).toBe(false);
    });
  });
});
