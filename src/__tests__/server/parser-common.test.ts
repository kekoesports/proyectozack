import {
  suggestMapping,
  parseAnyDate,
  parseEsNumber,
  applyMapping,
} from '@/lib/parsers/common';

// ── suggestMapping ────────────────────────────────────────────────────

describe('parser-common', () => {
  describe('suggestMapping', () => {
    it('returns empty mapping for empty headers array', () => {
      expect(suggestMapping([])).toEqual({});
    });

    it('maps exact-match headers to correct fields', () => {
      const mapping = suggestMapping(['fecha', 'concepto', 'neto', 'total', 'iva']);
      expect(mapping.issueDate).toBe(0);
      expect(mapping.concept).toBe(1);
      expect(mapping.netAmount).toBe(2);
      expect(mapping.totalAmount).toBe(3);
      expect(mapping.vatPct).toBe(4);
    });

    it('normalizes diacritics — "Fecha Emisión" matches issueDate', () => {
      const mapping = suggestMapping(['Fecha Emisión']);
      expect(mapping.issueDate).toBe(0);
    });

    it('normalizes diacritics — "Número" matches number field', () => {
      const mapping = suggestMapping(['Número']);
      expect(mapping.number).toBe(0);
    });

    it('normalizes diacritics — "Descripción" matches concept', () => {
      const mapping = suggestMapping(['Descripción']);
      expect(mapping.concept).toBe(0);
    });

    it('normalizes diacritics — "Categoría" matches category', () => {
      const mapping = suggestMapping(['Categoría']);
      expect(mapping.category).toBe(0);
    });

    it('normalizes diacritics — "Razón Social" matches counterpartyName', () => {
      const mapping = suggestMapping(['Razón Social']);
      expect(mapping.counterpartyName).toBe(0);
    });

    it('headers that do not match any field are not included in mapping', () => {
      const mapping = suggestMapping(['foobar', 'xyz123', 'qwerty']);
      expect(Object.keys(mapping)).toHaveLength(0);
    });

    it('picks the best-scoring column when multiple columns could match', () => {
      // 'total' is an exact hint for totalAmount (score 3)
      // 'importe total' is also a hint for totalAmount (score 3 for exact)
      // but 'total' at index 0 should win for totalAmount (first exact match)
      const mapping = suggestMapping(['total', 'importe total']);
      expect(mapping.totalAmount).toBe(0);
    });

    it('assigns each field independently — two fields can share no column', () => {
      const mapping = suggestMapping(['fecha', 'vencimiento', 'concepto', 'neto', 'total', 'iva']);
      expect(mapping.issueDate).toBe(0);
      expect(mapping.dueDate).toBe(1);
      expect(mapping.concept).toBe(2);
      expect(mapping.netAmount).toBe(3);
      expect(mapping.totalAmount).toBe(4);
      expect(mapping.vatPct).toBe(5);
    });

    it('uses prefix match (score 2) when no exact match exists', () => {
      // 'fechas' starts with hint 'fecha' → score 2 for issueDate
      const mapping = suggestMapping(['fechas']);
      expect(mapping.issueDate).toBe(0);
    });

    it('uses substring match (score 1) as fallback', () => {
      // 'mi concepto especial' includes hint 'concepto' → score 1
      const mapping = suggestMapping(['mi concepto especial']);
      expect(mapping.concept).toBe(0);
    });

    it('ignores empty-string headers', () => {
      // empty header → skipped by `if (!h) continue`
      const mapping = suggestMapping(['', 'concepto']);
      expect(mapping.concept).toBe(1);
    });

    it('maps "invoice number" to number field (exact hint match)', () => {
      const mapping = suggestMapping(['invoice number']);
      expect(mapping.number).toBe(0);
    });

    it('maps "base imponible" to netAmount (exact hint match)', () => {
      const mapping = suggestMapping(['base imponible']);
      expect(mapping.netAmount).toBe(0);
    });

    it('maps "nif" to issuerNif (exact hint match)', () => {
      const mapping = suggestMapping(['nif']);
      expect(mapping.issuerNif).toBe(0);
    });

    it('maps "emisor" to issuerName (exact hint match)', () => {
      const mapping = suggestMapping(['emisor']);
      expect(mapping.issuerName).toBe(0);
    });
  });

  // ── parseAnyDate ──────────────────────────────────────────────────────

  describe('parseAnyDate', () => {
    it('returns ISO date as-is', () => {
      expect(parseAnyDate('2026-04-15')).toBe('2026-04-15');
    });

    it('parses Spanish format DD/MM/YYYY', () => {
      expect(parseAnyDate('15/04/2026')).toBe('2026-04-15');
    });

    it('parses Spanish format with dashes DD-MM-YYYY', () => {
      expect(parseAnyDate('15-04-2026')).toBe('2026-04-15');
    });

    it('parses Spanish format with dots DD.MM.YYYY', () => {
      expect(parseAnyDate('15.04.2026')).toBe('2026-04-15');
    });

    it('expands 2-digit year with 20xx prefix', () => {
      expect(parseAnyDate('15/04/26')).toBe('2026-04-15');
    });

    it('pads single-digit day and month', () => {
      expect(parseAnyDate('5/4/2026')).toBe('2026-04-05');
    });

    it('returns null for empty string', () => {
      expect(parseAnyDate('')).toBeNull();
    });

    it('returns null for whitespace-only string', () => {
      expect(parseAnyDate('   ')).toBeNull();
    });

    it('returns null for pure text', () => {
      expect(parseAnyDate('not a date')).toBeNull();
    });

    it('returns null for partial date-like text', () => {
      expect(parseAnyDate('2026-04')).toBeNull();
    });

    it('trims surrounding whitespace before parsing', () => {
      expect(parseAnyDate('  2026-04-15  ')).toBe('2026-04-15');
    });

    it('trims whitespace around Spanish format', () => {
      expect(parseAnyDate('  15/04/2026  ')).toBe('2026-04-15');
    });
  });

  // ── parseEsNumber ─────────────────────────────────────────────────────

  describe('parseEsNumber', () => {
    it('parses plain integer', () => {
      expect(parseEsNumber('1234')).toBe(1234);
    });

    it('parses ES decimal — comma is last separator (1.234,56 → 1234.56)', () => {
      expect(parseEsNumber('1.234,56')).toBe(1234.56);
    });

    it('parses EN decimal — dot is last separator (1,234.56 → 1234.56)', () => {
      expect(parseEsNumber('1,234.56')).toBe(1234.56);
    });

    it('strips currency symbol € and parses ES decimal', () => {
      expect(parseEsNumber('1.234,56 €')).toBe(1234.56);
    });

    it('strips currency symbol $ and parses EN decimal', () => {
      expect(parseEsNumber('$1,234.56')).toBe(1234.56);
    });

    it('strips currency symbol £', () => {
      expect(parseEsNumber('£99.50')).toBe(99.5);
    });

    it('parses simple ES decimal with comma only (99,50 → 99.5)', () => {
      expect(parseEsNumber('99,50')).toBe(99.5);
    });

    it('parses simple EN decimal with dot only (99.50 → 99.5)', () => {
      expect(parseEsNumber('99.50')).toBe(99.5);
    });

    it('returns null for empty string', () => {
      expect(parseEsNumber('')).toBeNull();
    });

    it('returns null for non-numeric string', () => {
      expect(parseEsNumber('abc')).toBeNull();
    });

    it('returns 0 for "0"', () => {
      expect(parseEsNumber('0')).toBe(0);
    });

    it('returns negative number for "-100" (minus sign is preserved through Number())', () => {
      // The regex strips €$£ and spaces but not '-'; Number('-100') = -100 which is finite
      expect(parseEsNumber('-100')).toBe(-100);
    });

    it('returns null for whitespace-only after stripping currency symbols', () => {
      expect(parseEsNumber('   ')).toBeNull();
    });

    it('parses large ES number with thousands dots (1.000.000,00)', () => {
      expect(parseEsNumber('1.000.000,00')).toBe(1000000);
    });

    it('parses zero decimal (0,00)', () => {
      expect(parseEsNumber('0,00')).toBe(0);
    });
  });

  // ── applyMapping ──────────────────────────────────────────────────────

  describe('applyMapping', () => {
    const baseArgs = {
      headers: ['fecha', 'concepto', 'neto', 'total', 'iva'],
      mapping: {
        issueDate: 0,
        concept: 1,
        netAmount: 2,
        totalAmount: 3,
        vatPct: 4,
      },
      kind: 'income' as const,
      source: 'csv' as const,
    };

    it('filters out fully empty rows', () => {
      const result = applyMapping({
        ...baseArgs,
        rows: [['', '', '', '', '']],
      });
      expect(result).toHaveLength(0);
    });

    it('keeps rows that have at least one non-empty cell', () => {
      const result = applyMapping({
        ...baseArgs,
        rows: [['', 'Servicio', '', '', '']],
      });
      expect(result).toHaveLength(1);
    });

    it('produces correct draft for a fully valid row', () => {
      const result = applyMapping({
        ...baseArgs,
        rows: [['2026-04-15', 'Servicio web', '1000', '1210', '21']],
      });
      expect(result).toHaveLength(1);
      const { draft, warnings } = result[0]!;
      expect(warnings).toHaveLength(0);
      expect(draft.issueDate).toBe('2026-04-15');
      expect(draft.concept).toBe('Servicio web');
      expect(draft.netAmount).toBe('1000.00');
      expect(draft.totalAmount).toBe('1210.00');
      expect(draft.vatPct).toBe('21.00');
      expect(draft.kind).toBe('income');
      expect(draft.source).toBe('csv');
    });

    it('derives net from total when only total is present (effectiveVat from row)', () => {
      // net = total / (1 + vat/100) = 1210 / 1.21 ≈ 1000
      const result = applyMapping({
        ...baseArgs,
        rows: [['', 'Servicio', '', '1210', '21']],
      });
      const { draft } = result[0]!;
      expect(draft.totalAmount).toBe('1210.00');
      // 1210 / 1.21 = 1000.0000...
      expect(draft.netAmount).toBe('1000.00');
    });

    it('derives total from net when only net is present (effectiveVat from row)', () => {
      // total = net * (1 + vat/100) = 1000 * 1.21 = 1210
      const result = applyMapping({
        ...baseArgs,
        rows: [['', 'Servicio', '1000', '', '21']],
      });
      const { draft } = result[0]!;
      expect(draft.netAmount).toBe('1000.00');
      expect(draft.totalAmount).toBe('1210.00');
    });

    it('uses defaultVatPct when row has no vat column mapped', () => {
      const result = applyMapping({
        headers: ['concepto', 'total'],
        mapping: { concept: 0, totalAmount: 1 },
        kind: 'expense' as const,
        source: 'xlsx' as const,
        defaultVatPct: 10,
        rows: [['Compra material', '110']],
      });
      const { draft } = result[0]!;
      // net = 110 / (1 + 10/100) = 110 / 1.1 = 100
      expect(draft.totalAmount).toBe('110.00');
      expect(draft.netAmount).toBe('100.00');
    });

    it('falls back to effectiveVat = 21 when no vat in row and no defaultVatPct', () => {
      const result = applyMapping({
        headers: ['concepto', 'total'],
        mapping: { concept: 0, totalAmount: 1 },
        kind: 'income' as const,
        source: 'csv' as const,
        rows: [['Servicio', '121']],
      });
      const { draft } = result[0]!;
      // net = 121 / 1.21 = 100
      expect(draft.totalAmount).toBe('121.00');
      expect(draft.netAmount).toBe('100.00');
    });

    it('adds warning when concept is empty', () => {
      const result = applyMapping({
        ...baseArgs,
        rows: [['2026-04-15', '', '1000', '1210', '21']],
      });
      const { warnings } = result[0]!;
      expect(warnings.some((w) => w.includes('Concepto'))).toBe(true);
    });

    it('adds warning for unrecognized issue date', () => {
      const result = applyMapping({
        ...baseArgs,
        rows: [['not-a-date', 'Servicio', '1000', '1210', '21']],
      });
      const { warnings } = result[0]!;
      expect(warnings.some((w) => w.includes('Fecha emisión'))).toBe(true);
    });

    it('adds warning for unrecognized due date', () => {
      const result = applyMapping({
        headers: ['vencimiento', 'concepto', 'neto'],
        mapping: { dueDate: 0, concept: 1, netAmount: 2 },
        kind: 'income' as const,
        source: 'csv' as const,
        rows: [['bad-due-date', 'Servicio', '1000']],
      });
      const { warnings } = result[0]!;
      expect(warnings.some((w) => w.includes('Vencimiento'))).toBe(true);
    });

    it('adds warning for unrecognized net amount', () => {
      const result = applyMapping({
        ...baseArgs,
        rows: [['2026-04-15', 'Servicio', 'not-a-number', '1210', '21']],
      });
      const { warnings } = result[0]!;
      expect(warnings.some((w) => w.includes('neto'))).toBe(true);
    });

    it('adds warning for unrecognized total amount', () => {
      const result = applyMapping({
        ...baseArgs,
        rows: [['2026-04-15', 'Servicio', '1000', 'bad-total', '21']],
      });
      const { warnings } = result[0]!;
      expect(warnings.some((w) => w.includes('Total'))).toBe(true);
    });

    it('omits fields not present in mapping from draft', () => {
      const result = applyMapping({
        headers: ['concepto', 'neto'],
        mapping: { concept: 0, netAmount: 1 },
        kind: 'income' as const,
        source: 'csv' as const,
        rows: [['Servicio', '1000']],
      });
      const { draft } = result[0]!;
      expect(draft.issueDate).toBeUndefined();
      expect(draft.dueDate).toBeUndefined();
      expect(draft.vatPct).toBeUndefined();
    });

    it('maps optional fields: number, counterpartyName, issuerNif, issuerName, category', () => {
      const result = applyMapping({
        headers: ['num', 'concepto', 'neto', 'total', 'cliente', 'nif', 'emisor', 'cat'],
        mapping: {
          number: 0,
          concept: 1,
          netAmount: 2,
          totalAmount: 3,
          counterpartyName: 4,
          issuerNif: 5,
          issuerName: 6,
          category: 7,
        },
        kind: 'expense' as const,
        source: 'xlsx' as const,
        rows: [['F-001', 'Consultoría', '800', '968', 'Acme SL', 'B12345678', 'Mi Empresa', 'Servicios']],
      });
      const { draft, warnings } = result[0]!;
      expect(warnings).toHaveLength(0);
      expect(draft.number).toBe('F-001');
      expect(draft.counterpartyName).toBe('Acme SL');
      expect(draft.issuerNif).toBe('B12345678');
      expect(draft.issuerName).toBe('Mi Empresa');
      expect(draft.category).toBe('Servicios');
    });

    it('processes multiple rows independently', () => {
      const result = applyMapping({
        ...baseArgs,
        rows: [
          ['2026-01-01', 'Servicio A', '500', '605', '21'],
          ['2026-02-01', 'Servicio B', '200', '242', '21'],
        ],
      });
      expect(result).toHaveLength(2);
      expect(result[0]!.draft.concept).toBe('Servicio A');
      expect(result[1]!.draft.concept).toBe('Servicio B');
    });

    it('handles Spanish date format in issueDate cell', () => {
      const result = applyMapping({
        ...baseArgs,
        rows: [['15/04/2026', 'Servicio', '1000', '1210', '21']],
      });
      const { draft } = result[0]!;
      expect(draft.issueDate).toBe('2026-04-15');
    });

    it('handles ES number format in amounts', () => {
      const result = applyMapping({
        ...baseArgs,
        rows: [['2026-04-15', 'Servicio', '1.000,00', '1.210,00', '21']],
      });
      const { draft } = result[0]!;
      expect(draft.netAmount).toBe('1000.00');
      expect(draft.totalAmount).toBe('1210.00');
    });

    it('row vat takes precedence over defaultVatPct in effectiveVat', () => {
      // row has vatPct = 10, defaultVatPct = 21 → effectiveVat should be 10
      const result = applyMapping({
        headers: ['concepto', 'neto', 'iva'],
        mapping: { concept: 0, netAmount: 1, vatPct: 2 },
        kind: 'income' as const,
        source: 'csv' as const,
        defaultVatPct: 21,
        rows: [['Servicio', '100', '10']],
      });
      const { draft } = result[0]!;
      // total = 100 * (1 + 10/100) = 110
      expect(draft.totalAmount).toBe('110.00');
      expect(draft.vatPct).toBe('10.00');
    });

    it('does not add concept warning when concept is present', () => {
      const result = applyMapping({
        ...baseArgs,
        rows: [['', 'Servicio válido', '1000', '1210', '21']],
      });
      const { warnings } = result[0]!;
      expect(warnings.every((w) => !w.includes('Concepto'))).toBe(true);
    });

    it('formats money amounts to 2 decimal places', () => {
      const result = applyMapping({
        headers: ['concepto', 'neto', 'total'],
        mapping: { concept: 0, netAmount: 1, totalAmount: 2 },
        kind: 'income' as const,
        source: 'csv' as const,
        rows: [['Servicio', '100', '121']],
      });
      const { draft } = result[0]!;
      expect(draft.netAmount).toBe('100.00');
      expect(draft.totalAmount).toBe('121.00');
    });
  });
});
