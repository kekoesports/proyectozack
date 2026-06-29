import type { PayrollImportRow } from './types';

export type ManualRow = {
  readonly id: number;
  readonly counterpartyName: string;
  readonly yearMonth: string;
  readonly liquidoPercibir: string;
  readonly costoEmpresa: string;
  readonly totalDevengado: string;
  readonly totalDeducciones: string;
  readonly irpfPct: string;
  readonly notes: string;
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// Handles Spanish format (1.696,55) and plain decimals (1363.00 / 1363,00).
export function normalizeAmount(s: string): string {
  const trimmed = s.trim();
  if (!trimmed) return '0.00';
  const cleaned = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed;
  const n = parseFloat(cleaned);
  return isNaN(n) ? '0.00' : n.toFixed(2);
}

export function emptyManualRow(id: number, suggestedYearMonth?: string): ManualRow {
  return {
    id,
    counterpartyName: '',
    yearMonth: suggestedYearMonth ?? '',
    liquidoPercibir: '',
    costoEmpresa: '',
    totalDevengado: '',
    totalDeducciones: '',
    irpfPct: '',
    notes: '',
  };
}

export function manualRowToPayrollRow(row: ManualRow): PayrollImportRow {
  const name = row.counterpartyName.trim();
  const slug = name ? slugify(name) : `trabajador-${row.id}`;
  const ym = row.yearMonth.trim() || 'desconocido';
  const txId = `payroll:${slug}:${ym}`;
  const costoStr = normalizeAmount(row.costoEmpresa);
  const concept = name ? `Nómina ${name} ${ym}` : `Nómina pág. ${row.id} ${ym}`;
  const isoDate = ym !== 'desconocido' ? `${ym}-01` : new Date().toISOString().slice(0, 10);

  const noteParts: string[] = [];
  if (ym !== 'desconocido') noteParts.push(`Período: ${ym}`);
  if (costoStr !== '0.00') noteParts.push(`Coste empresa: ${costoStr}`);
  if (row.liquidoPercibir) noteParts.push(`Líquido: ${row.liquidoPercibir}`);
  if (row.totalDevengado) noteParts.push(`T.Devengado: ${row.totalDevengado}`);
  if (row.totalDeducciones) noteParts.push(`T.Deducciones: ${row.totalDeducciones}`);
  if (row.irpfPct) noteParts.push(`IRPF: ${row.irpfPct}%`);
  if (row.notes) noteParts.push(row.notes);
  noteParts.push('Entrada manual');

  const missingRequired = !name || costoStr === '0.00' || ym === 'desconocido';

  return {
    page: row.id,
    include: !missingRequired,
    slug,
    yearMonth: ym,
    txId,
    counterpartyName: name,
    concept,
    issueDate: isoDate,
    netAmount: costoStr,
    totalAmount: costoStr,
    vatPct: '0.00',
    withholdingPct: '0.00',
    expenseGroup: 'operational',
    expenseSubtype: 'nomina_socio',
    status: 'pagada',
    notes: noteParts.join(' | '),
    warning: missingRequired ? 'Faltan campos obligatorios (trabajador, mes/año, coste empresa)' : null,
  };
}
