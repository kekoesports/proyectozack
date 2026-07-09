/**
 * Tests del parser XLSX del Libro Mayor.
 *
 * Usa el fixture sintético en `src/features/libro-mayor/__fixtures__/`.
 * NUNCA lee el Libro Mayor real.
 */

import fs from 'fs';
import path from 'path';
import { parseLedgerXlsx, checkDoubleEntry } from '@/features/libro-mayor/parser/xlsx-parser';
import { parseAmount, parseSpanishDate } from '@/features/libro-mayor/parser/parse-amount';
import { loadSampleLedger } from '@/features/libro-mayor/__fixtures__/load-sample';

const XLSX_FIXTURE = path.join(process.cwd(), 'src/features/libro-mayor/__fixtures__/sample-ledger.xlsx');

describe('parseAmount', () => {
  it('devuelve 0 para null/undefined/vacío', () => {
    expect(parseAmount(null)).toBe(0);
    expect(parseAmount(undefined)).toBe(0);
    expect(parseAmount('')).toBe(0);
    expect(parseAmount('   ')).toBe(0);
  });

  it('parsea formato inglés "1,234.56" → 1234.56', () => {
    expect(parseAmount('1,234.56')).toBe(1234.56);
    expect(parseAmount('10,000.00')).toBe(10000);
  });

  it('parsea formato español "1.234,56" → 1234.56', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('10.000,00')).toBe(10000);
  });

  it('parsea decimales sueltos "1234.56" y "1234,56"', () => {
    expect(parseAmount('1234.56')).toBe(1234.56);
    expect(parseAmount('1234,56')).toBe(1234.56);
  });

  it('parsea números negativos', () => {
    expect(parseAmount('-1,234.56')).toBe(-1234.56);
    expect(parseAmount('(1234,56)')).toBe(-1234.56);
  });

  it('acepta números tal cual', () => {
    expect(parseAmount(1234.56)).toBe(1234.56);
    expect(parseAmount(0)).toBe(0);
  });

  it('separador de miles sin decimal ("1,234")', () => {
    expect(parseAmount('1,234')).toBe(1234);
  });
});

describe('parseSpanishDate', () => {
  it('convierte "15/01/2026" → "2026-01-15"', () => {
    expect(parseSpanishDate('15/01/2026')).toBe('2026-01-15');
  });

  it('devuelve null para formato inválido', () => {
    expect(parseSpanishDate('2026-01-15')).toBeNull();
    expect(parseSpanishDate('invalid')).toBeNull();
    expect(parseSpanishDate('')).toBeNull();
    expect(parseSpanishDate(null)).toBeNull();
  });
});

describe('parseLedgerXlsx — fixture sintético', () => {
  const buf = fs.readFileSync(XLSX_FIXTURE);
  const report = parseLedgerXlsx(buf);

  it('extrae metadata correctamente', () => {
    expect(report.metadata.empresa).toBe('TEST COMPANY SL');
    expect(report.metadata.periodoFrom).toBe('2026-01-01');
    expect(report.metadata.periodoTo).toBe('2026-06-30');
    expect(report.metadata.fecha).toBe('2026-07-01');
  });

  it('detecta las 13 cuentas del fixture', () => {
    expect(report.accounts).toHaveLength(13);
  });

  it('detecta cuentas de las categorías críticas 430/410/572/705/640/465/555', () => {
    const codes = report.accounts.map((a) => a.code);
    expect(codes.some((c) => c.startsWith('430'))).toBe(true);
    expect(codes.some((c) => c.startsWith('410'))).toBe(true);
    expect(codes.some((c) => c.startsWith('572'))).toBe(true);
    expect(codes.some((c) => c.startsWith('705'))).toBe(true);
    expect(codes.some((c) => c.startsWith('640'))).toBe(true);
    expect(codes.some((c) => c.startsWith('465'))).toBe(true);
    expect(codes.some((c) => c.startsWith('555'))).toBe(true);
  });

  it('preserva saldos anteriores para cuentas con arrastre', () => {
    const capital = report.accounts.find((a) => a.code === '10000000');
    expect(capital?.saldoAnterior).toBeCloseTo(-3000, 2);

    const banco = report.accounts.find((a) => a.code === '57200001');
    expect(banco?.saldoAnterior).toBeCloseTo(3500, 2);
  });

  it('preserva movimientos con fecha, concepto, debe/haber y contrapartida', () => {
    const clienteA = report.accounts.find((a) => a.code === '43000001');
    expect(clienteA?.movements).toHaveLength(2);
    const first = clienteA?.movements[0];
    expect(first?.date).toBe('2026-01-15');
    expect(first?.concept).toBe('TEST_Factura_01');
    expect(first?.debe).toBeCloseTo(5000, 2);
    expect(first?.haber).toBe(0);
    expect(first?.contrapartida).toBe('70500001');
  });

  it('calcula totalDebe/totalHaber de cuentas correctamente', () => {
    const cliA = report.accounts.find((a) => a.code === '43000001');
    expect(cliA?.totalDebe).toBeCloseTo(8000, 2);
    expect(cliA?.totalHaber).toBe(0);
    expect(cliA?.totalSaldo).toBeCloseTo(8000, 2);
  });

  it('cuadra en partida doble', () => {
    const check = checkDoubleEntry(report);
    expect(check.ok).toBe(true);
    expect(check.totalDebe).toBeCloseTo(24590, 2);
    expect(check.totalHaber).toBeCloseTo(24590, 2);
    expect(Math.abs(check.delta)).toBeLessThan(0.02);
  });

  it('lanza si el buffer está corrupto', () => {
    expect(() => parseLedgerXlsx(Buffer.from('not an xlsx'))).toThrow();
  });
});

describe('loadSampleLedger (JSON fixture)', () => {
  const report = loadSampleLedger();

  it('carga el fixture JSON válido', () => {
    expect(report.metadata.empresa).toBe('TEST COMPANY SL');
    expect(report.accounts.length).toBeGreaterThan(0);
  });

  it('el fixture JSON cuadra en partida doble', () => {
    const check = checkDoubleEntry(report);
    expect(check.ok).toBe(true);
  });

  it('el fixture JSON coincide con el fixture XLSX (mismo shape)', () => {
    const buf = fs.readFileSync(XLSX_FIXTURE);
    const fromXlsx = parseLedgerXlsx(buf);
    expect(fromXlsx.accounts.length).toBe(report.accounts.length);
    // Comparar códigos y totales — no comparamos objetos completos porque
    // el fixture JSON incluye claves opcionales que el XLSX no propaga.
    for (const acc of report.accounts) {
      const other = fromXlsx.accounts.find((a) => a.code === acc.code);
      expect(other).toBeDefined();
      expect(other?.totalDebe).toBeCloseTo(acc.totalDebe, 2);
      expect(other?.totalHaber).toBeCloseTo(acc.totalHaber, 2);
    }
  });
});

describe('parser — nombres del fixture NUNCA son datos reales', () => {
  const report = loadSampleLedger();
  it('todos los nombres de cuenta empiezan con TEST_', () => {
    for (const a of report.accounts) {
      expect(a.name.startsWith('TEST_')).toBe(true);
    }
  });

  it('todos los conceptos de movimiento empiezan con TEST_', () => {
    for (const a of report.accounts) {
      for (const m of a.movements) {
        expect(m.concept.startsWith('TEST_')).toBe(true);
      }
    }
  });
});
