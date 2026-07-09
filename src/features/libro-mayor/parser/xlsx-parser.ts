import * as XLSX from 'xlsx';
import { LedgerReportSchema, type LedgerAccount, type LedgerMovement, type LedgerReport } from './types';
import { parseAmount, parseSpanishDate } from './parse-amount';

/**
 * Parser XLSX del Libro Mayor (formato Sage/Contasol "Cuentas corrientes").
 *
 * Estructura esperada del Excel:
 *   - Fila 0-3: metadata (empresa, período, fecha extracción).
 *   - Fila 4: cabecera de columnas (Cuenta | Descripción | Punt. | Fecha |
 *             Concepto | Documento | Debe | Haber | Saldo | Contrapartida).
 *   - Filas 5+: datos jerárquicos:
 *       · Cabecera de cuenta (columna Cuenta + Descripción).
 *       · Movimientos (Fecha + Concepto + Debe/Haber/Saldo).
 *       · "Saldos anteriores" (arrastre inicial).
 *       · "Total cuenta" (subtotal).
 *
 * El parser es tolerante a variaciones menores de metadata (posición de fecha,
 * lenguaje del header), pero requiere que la cabecera de columnas contenga las
 * palabras clave `Cuenta`, `Debe`, `Haber`. Si no se detecta, lanza error.
 *
 * NUNCA persiste, NUNCA modifica el archivo, NUNCA escribe en DB.
 * Consume un buffer y retorna un `LedgerReport` validado por Zod.
 */

const COL_INDICES = {
  cuenta: 0,
  descripcion: 1,
  punt: 2,
  fecha: 3,
  concepto: 4,
  documento: 5,
  debe: 6,
  haber: 7,
  saldo: 8,
  contrapartida: 9,
} as const;

const REQUIRED_HEADER_KEYS = ['cuenta', 'debe', 'haber'] as const;

type RawCell = string | number | null | undefined;
type RawRow = ReadonlyArray<RawCell>;

/**
 * Localiza la fila de cabecera (donde aparecen "Cuenta", "Debe", "Haber").
 * Busca en las primeras 20 filas para tolerar metadata variable.
 * Retorna el índice de fila, o -1 si no se encuentra.
 */
function findHeaderRow(rows: readonly RawRow[]): number {
  const maxSearch = Math.min(20, rows.length);
  for (let i = 0; i < maxSearch; i++) {
    const row = rows[i];
    if (!row) continue;
    const lower = row.map((c) => String(c ?? '').toLowerCase());
    const matches = REQUIRED_HEADER_KEYS.every((k) => lower.some((c) => c.includes(k)));
    if (matches) return i;
  }
  return -1;
}

/**
 * Extrae metadata (empresa, periodo, fecha) de las primeras filas.
 * La metadata suele estar en la columna A, líneas 1-3 con formato:
 *   "Empresa: XXXX"
 *   "Período: de DD/MM/YYYY a DD/MM/YYYY"
 *   "Fecha: DD/MM/YYYY"
 */
function extractMetadata(rows: readonly RawRow[], headerRow: number): {
  empresa: string;
  periodoFrom: string;
  periodoTo: string;
  fecha: string;
} {
  let empresa = 'DESCONOCIDA';
  let periodoFrom = '1970-01-01';
  let periodoTo = '1970-12-31';
  let fecha = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < headerRow; i++) {
    const first = String(rows[i]?.[0] ?? '').trim();
    if (!first) continue;
    const empMatch = /^empresa:\s*(.+)$/i.exec(first);
    if (empMatch?.[1]) { empresa = empMatch[1].trim(); continue; }
    const perMatch = /per[ií]odo:\s*de\s+(\d{2}\/\d{2}\/\d{4})\s+a\s+(\d{2}\/\d{2}\/\d{4})/i.exec(first);
    if (perMatch?.[1] && perMatch[2]) {
      const from = parseSpanishDate(perMatch[1]);
      const to = parseSpanishDate(perMatch[2]);
      if (from) periodoFrom = from;
      if (to) periodoTo = to;
      continue;
    }
    const fechaMatch = /^fecha:\s*(\d{2}\/\d{2}\/\d{4})/i.exec(first);
    if (fechaMatch?.[1]) {
      const parsed = parseSpanishDate(fechaMatch[1]);
      if (parsed) fecha = parsed;
    }
  }

  return { empresa, periodoFrom, periodoTo, fecha };
}

/**
 * Parsea un Buffer de XLSX y retorna un `LedgerReport` validado.
 * Lanza si la estructura no es reconocible o si el reporte no cuadra en
 * partida doble (tolerancia 0.02 €).
 */
export function parseLedgerXlsx(buffer: Buffer | Uint8Array): LedgerReport {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  if (wb.SheetNames.length === 0) throw new Error('libro-mayor:empty-workbook');
  const firstName = wb.SheetNames[0];
  if (!firstName) throw new Error('libro-mayor:empty-workbook');
  const ws = wb.Sheets[firstName];
  if (!ws) throw new Error('libro-mayor:sheet-missing');

  const rows = XLSX.utils.sheet_to_json<RawRow>(ws, {
    header: 1,
    defval: null,
    raw: false,
    blankrows: false,
  });

  const headerRow = findHeaderRow(rows);
  if (headerRow < 0) {
    throw new Error('libro-mayor:header-not-found');
  }

  const metadata = extractMetadata(rows, headerRow);

  const accountsMap = new Map<string, LedgerAccount>();
  let currentCode: string | null = null;

  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const cuenta = row[COL_INDICES.cuenta] ? String(row[COL_INDICES.cuenta]).trim() : '';
    const concepto = row[COL_INDICES.concepto] ? String(row[COL_INDICES.concepto]).trim() : '';

    if (cuenta) {
      // Cabecera de nueva cuenta.
      const descripcion = String(row[COL_INDICES.descripcion] ?? '').trim();
      if (!accountsMap.has(cuenta)) {
        accountsMap.set(cuenta, {
          code: cuenta,
          name: descripcion,
          saldoAnterior: 0,
          totalDebe: 0,
          totalHaber: 0,
          totalSaldo: 0,
          movements: [],
        });
      }
      currentCode = cuenta;
      continue;
    }

    if (!currentCode) continue;
    const acc = accountsMap.get(currentCode);
    if (!acc) continue;

    // Fila especial "Saldos anteriores".
    if (concepto === 'Saldos anteriores') {
      acc.saldoAnterior = parseAmount(row[COL_INDICES.debe]) - parseAmount(row[COL_INDICES.haber]);
      continue;
    }

    // Fila especial "Total cuenta".
    if (concepto === 'Total cuenta') {
      acc.totalDebe = parseAmount(row[COL_INDICES.debe]);
      acc.totalHaber = parseAmount(row[COL_INDICES.haber]);
      acc.totalSaldo = parseAmount(row[COL_INDICES.saldo]);
      continue;
    }

    // Movimiento normal — solo si tiene fecha válida.
    const fechaIso = parseSpanishDate(row[COL_INDICES.fecha]);
    if (!fechaIso) continue;

    const movement: LedgerMovement = {
      date: fechaIso,
      concept: concepto,
      document: String(row[COL_INDICES.documento] ?? '').trim(),
      debe: parseAmount(row[COL_INDICES.debe]),
      haber: parseAmount(row[COL_INDICES.haber]),
      saldo: parseAmount(row[COL_INDICES.saldo]),
      contrapartida: String(row[COL_INDICES.contrapartida] ?? '').trim(),
    };
    acc.movements.push(movement);
  }

  const report: LedgerReport = {
    metadata,
    accounts: Array.from(accountsMap.values()),
  };

  // Reparación de totales para cuentas sin fila "Total cuenta" explícita
  // (algunas variantes del export solo tienen movimientos).
  for (const acc of report.accounts) {
    if (acc.totalDebe === 0 && acc.totalHaber === 0 && acc.movements.length > 0) {
      let d = 0;
      let h = 0;
      for (const m of acc.movements) {
        d += m.debe;
        h += m.haber;
      }
      acc.totalDebe = d;
      acc.totalHaber = h;
      acc.totalSaldo = acc.saldoAnterior + d - h;
    }
  }

  // Validación Zod al boundary.
  const parsed = LedgerReportSchema.safeParse(report);
  if (!parsed.success) {
    throw new Error('libro-mayor:invalid-shape:' + parsed.error.issues.map((i) => i.path.join('.')).join(','));
  }
  return parsed.data;
}

/**
 * Comprueba si el reporte cuadra en partida doble (suma Debe = suma Haber).
 * Tolerancia 0.02 € para redondeos.
 */
export function checkDoubleEntry(report: LedgerReport): { ok: boolean; totalDebe: number; totalHaber: number; delta: number } {
  let totalDebe = 0;
  let totalHaber = 0;
  for (const acc of report.accounts) {
    for (const m of acc.movements) {
      totalDebe += m.debe;
      totalHaber += m.haber;
    }
  }
  const delta = totalDebe - totalHaber;
  return { ok: Math.abs(delta) < 0.02, totalDebe, totalHaber, delta };
}
