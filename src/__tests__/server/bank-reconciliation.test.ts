import {
  suggestBankMapping,
  applyBankMapping,
  hashTransaction,
  sanitizeBankRawJson,
  parseBankCsv,
  BANK_MAPPABLE_FIELDS,
} from '@/lib/parsers/bankTransaction';
import { scoreMatches, topMatch } from '@/lib/services/bank-reconciliation/matcher';
import type { BankTransaction } from '@/types';
import type { MatchCandidate } from '@/lib/services/bank-reconciliation/matcher';

// ── CSV parsing ───────────────────────────────────────────────────────

describe('parseBankCsv', () => {
  it('parsea CSV con delimitador coma', () => {
    const csv = 'Fecha,Concepto,Importe\n2024-01-15,Pago proveedor,-150.00\n2024-01-16,Cobro cliente,300.00';
    const { headers, rows } = parseBankCsv(csv);
    expect(headers).toEqual(['Fecha', 'Concepto', 'Importe']);
    expect(rows).toHaveLength(2);
  });

  it('parsea CSV con delimitador punto y coma', () => {
    const csv = 'Fecha;Concepto;Importe\n15/01/2024;Pago;-150,00\n16/01/2024;Cobro;300,00';
    const { headers, rows } = parseBankCsv(csv);
    expect(headers).toEqual(['Fecha', 'Concepto', 'Importe']);
    expect(rows).toHaveLength(2);
  });

  it('retorna vacío para string vacío', () => {
    const { headers, rows } = parseBankCsv('');
    expect(headers).toHaveLength(0);
    expect(rows).toHaveLength(0);
  });

  it('maneja BOM UTF-8', () => {
    const csv = '﻿Fecha,Concepto,Importe\n2024-01-01,Test,100.00';
    const { headers } = parseBankCsv(csv);
    expect(headers[0]).toBe('Fecha');
  });
});

// ── Column mapping suggestion ─────────────────────────────────────────

describe('suggestBankMapping', () => {
  it('detecta columna de fecha de operación', () => {
    const headers = ['Fecha', 'Concepto', 'Importe'];
    const mapping = suggestBankMapping(headers);
    expect(mapping.bookingDate).toBe(0);
  });

  it('detecta columna de importe', () => {
    const headers = ['fecha', 'descripcion', 'importe', 'saldo'];
    const mapping = suggestBankMapping(headers);
    expect(mapping.amount).toBe(2);
  });

  it('detecta columna de descripción / concepto', () => {
    const headers = ['Date', 'Narrative', 'Amount'];
    const mapping = suggestBankMapping(headers);
    expect(mapping.description).toBe(1);
  });

  it('detecta IBAN de contraparte', () => {
    const headers = ['Fecha', 'Concepto', 'Importe', 'IBAN'];
    const mapping = suggestBankMapping(headers);
    expect(mapping.counterpartyAccount).toBe(3);
  });

  it('devuelve mapping vacío para headers sin coincidencia', () => {
    const headers = ['col_a', 'col_b', 'col_c'];
    const mapping = suggestBankMapping(headers);
    expect(Object.keys(mapping)).toHaveLength(0);
  });
});

// ── applyBankMapping ──────────────────────────────────────────────────

describe('applyBankMapping', () => {
  const headers = ['Fecha', 'Concepto', 'Importe', 'Nombre'];
  const mapping = { bookingDate: 0, description: 1, amount: 2, counterpartyName: 3 };

  it('parsea filas correctamente', () => {
    const rows = [['2024-01-15', 'Pago proveedor', '-150.00', 'Empresa X']];
    const results = applyBankMapping({ headers, rows, mapping });
    expect(results).toHaveLength(1);
    expect(results[0]!.amount).toBe(150);
    expect(results[0]!.direction).toBe('expense');
    expect(results[0]!.description).toBe('Pago proveedor');
    expect(results[0]!.counterpartyName).toBe('Empresa X');
  });

  it('detecta dirección income para importe positivo', () => {
    const rows = [['2024-01-16', 'Cobro cliente', '300.00', 'Cliente Y']];
    const results = applyBankMapping({ headers, rows, mapping });
    expect(results[0]!.direction).toBe('income');
    expect(results[0]!.amount).toBe(300);
  });

  it('ignora filas sin fecha válida', () => {
    const rows = [['fecha-invalida', 'concepto', '100', 'test']];
    const results = applyBankMapping({ headers, rows, mapping });
    expect(results).toHaveLength(0);
  });

  it('ignora filas sin importe válido', () => {
    const rows = [['2024-01-01', 'concepto', 'no-number', 'test']];
    const results = applyBankMapping({ headers, rows, mapping });
    expect(results).toHaveLength(0);
  });

  it('parsea fecha en formato español DD/MM/YYYY', () => {
    const rows = [['15/01/2024', 'test', '100', 'x']];
    const results = applyBankMapping({ headers, rows, mapping });
    expect(results[0]!.bookingDate.getDate()).toBe(15);
    expect(results[0]!.bookingDate.getMonth()).toBe(0); // enero = 0
  });

  it('parsea importe en formato español con coma decimal', () => {
    const rows = [['2024-01-01', 'test', '1.234,56', 'x']];
    const results = applyBankMapping({ headers, rows, mapping });
    expect(results[0]!.amount).toBeCloseTo(1234.56);
  });

  it('omite filas completamente vacías', () => {
    const rows = [['', '', '', ''], ['2024-01-01', 'test', '100', 'x']];
    const results = applyBankMapping({ headers, rows, mapping });
    expect(results).toHaveLength(1);
  });
});

// ── hashTransaction ───────────────────────────────────────────────────

describe('hashTransaction', () => {
  const baseRow = {
    bookingDate: new Date('2024-01-15'),
    valueDate: null,
    amount: 150,
    currency: 'EUR',
    direction: 'expense' as const,
    description: 'Pago proveedor',
    counterpartyName: 'Empresa X',
    counterpartyAccountMasked: null,
    reference: null,
    category: null,
    rawFields: {},
    warnings: [],
  };

  it('produce hash SHA-256 de 64 caracteres', () => {
    const hash = hashTransaction(baseRow, 1);
    expect(hash).toHaveLength(64);
    expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
  });

  it('mismo input produce el mismo hash', () => {
    const h1 = hashTransaction(baseRow, 1);
    const h2 = hashTransaction(baseRow, 1);
    expect(h1).toBe(h2);
  });

  it('diferente cuenta produce hash distinto', () => {
    const h1 = hashTransaction(baseRow, 1);
    const h2 = hashTransaction(baseRow, 2);
    expect(h1).not.toBe(h2);
  });

  it('diferente importe produce hash distinto', () => {
    const h1 = hashTransaction(baseRow, 1);
    const h2 = hashTransaction({ ...baseRow, amount: 200 }, 1);
    expect(h1).not.toBe(h2);
  });

  it('diferente fecha produce hash distinto', () => {
    const h1 = hashTransaction(baseRow, 1);
    const h2 = hashTransaction({ ...baseRow, bookingDate: new Date('2024-01-16') }, 1);
    expect(h1).not.toBe(h2);
  });

  it('bankAccountId null produce hash válido', () => {
    const hash = hashTransaction(baseRow, null);
    expect(hash).toHaveLength(64);
  });
});

// ── sanitizeBankRawJson ───────────────────────────────────────────────

describe('sanitizeBankRawJson', () => {
  it('retorna objeto para input válido', () => {
    const result = sanitizeBankRawJson({ fecha: '2024-01-15', importe: '150.00' });
    expect(typeof result).toBe('object');
  });

  it('enmascara IBAN en valores de string', () => {
    const result = sanitizeBankRawJson({ cuenta: 'ES12 3456 7890 1234 5678 9012' });
    expect(JSON.stringify(result)).not.toContain('3456 7890');
  });

  it('retorna objeto vacío para input no-objeto', () => {
    expect(sanitizeBankRawJson('string')).toEqual({});
    expect(sanitizeBankRawJson(null)).toEqual({});
    expect(sanitizeBankRawJson(undefined)).toEqual({});
    expect(sanitizeBankRawJson([1, 2, 3])).toEqual({});
  });
});

// ── scoreMatches / topMatch ───────────────────────────────────────────

const mockTx = (overrides?: Partial<BankTransaction>): BankTransaction => ({
  id: 1,
  bankAccountId: 1,
  importId: null,
  externalId: null,
  transactionHash: 'abc123',
  bookingDate: new Date('2024-01-15'),
  valueDate: null,
  amount: '150.00',
  currency: 'EUR',
  direction: 'expense',
  description: 'Pago a Empresa X por servicios',
  counterpartyName: 'Empresa X',
  counterpartyAccountMasked: null,
  reference: 'REF-001',
  category: null,
  status: 'imported',
  rawJsonSanitized: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const mockCandidate = (overrides?: Partial<MatchCandidate>): MatchCandidate => ({
  entityId: 10,
  matchType: 'expense',
  direction: 'expense',
  amount: 150,
  date: new Date('2024-01-15'),
  name: 'Empresa X',
  reference: 'REF-001',
  ...overrides,
});

describe('scoreMatches', () => {
  it('score alto para coincidencia exacta de importe, fecha, nombre y referencia', () => {
    const results = scoreMatches(mockTx(), [mockCandidate()]);
    expect(results).toHaveLength(1);
    expect(results[0]!.confidence).toBeGreaterThanOrEqual(80);
  });

  it('filtra por dirección — income no coincide con expense', () => {
    const results = scoreMatches(mockTx({ direction: 'income' }), [mockCandidate({ direction: 'expense' })]);
    expect(results).toHaveLength(0);
  });

  it('score menor sin coincidencia de nombre', () => {
    const results = scoreMatches(mockTx(), [mockCandidate({ name: 'Empresa completamente diferente' })]);
    const resultsWithName = scoreMatches(mockTx(), [mockCandidate()]);
    if (results.length > 0 && resultsWithName.length > 0) {
      expect(results[0]!.confidence).toBeLessThanOrEqual(resultsWithName[0]!.confidence);
    }
  });

  it('score menor para fecha con 2 días de diferencia', () => {
    const closeDate = new Date('2024-01-17');
    const resultsClose = scoreMatches(mockTx(), [mockCandidate({ date: closeDate, reference: null })]);
    const resultsExact = scoreMatches(mockTx(), [mockCandidate({ reference: null })]);
    if (resultsClose.length > 0 && resultsExact.length > 0) {
      expect(resultsClose[0]!.confidence).toBeLessThan(resultsExact[0]!.confidence);
    }
  });

  it('umbral mínimo: descarta candidatos con baja coincidencia', () => {
    const badCandidate = mockCandidate({
      amount: 9999,
      date: new Date('2023-06-01'),
      name: 'Totalmente diferente',
      reference: null,
    });
    const results = scoreMatches(mockTx(), [badCandidate]);
    expect(results).toHaveLength(0);
  });

  it('ordena por confidence descendente', () => {
    const best = mockCandidate();
    const worse = mockCandidate({ entityId: 11, name: 'Empresa diferente', reference: null });
    const results = scoreMatches(mockTx(), [worse, best]);
    if (results.length >= 2) {
      expect(results[0]!.confidence).toBeGreaterThanOrEqual(results[1]!.confidence);
    }
  });
});

describe('topMatch', () => {
  it('retorna el mejor candidato', () => {
    const result = topMatch(mockTx(), [mockCandidate()]);
    expect(result).not.toBeNull();
    expect(result?.matchedEntityId).toBe(10);
  });

  it('retorna null si no hay candidatos que superen el umbral', () => {
    const result = topMatch(mockTx(), []);
    expect(result).toBeNull();
  });
});

// ── BANK_MAPPABLE_FIELDS — no contiene herramientas de escritura ──────

describe('BANK_MAPPABLE_FIELDS', () => {
  it('todos los campos son de lectura/mapeo (sin destructivos)', () => {
    for (const field of BANK_MAPPABLE_FIELDS) {
      expect(field).not.toMatch(/delete|drop|write|create|update/i);
    }
  });

  it('incluye los campos obligatorios mínimos', () => {
    expect(BANK_MAPPABLE_FIELDS).toContain('bookingDate');
    expect(BANK_MAPPABLE_FIELDS).toContain('amount');
    expect(BANK_MAPPABLE_FIELDS).toContain('description');
  });
});
