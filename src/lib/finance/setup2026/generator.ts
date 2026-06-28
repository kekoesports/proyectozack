import type {
  HistoricalExpenseRow,
  RecurringExpenseRow,
  Setup2026HistoricalConfig,
  Setup2026Summary,
  CategoryKey,
} from './types';

// ── Pure math helpers ─────────────────────────────────────────────────────────

/** net × (1 + (vatPct − withholdingPct) / 100) */
export function calcTotal(net: number, vatPct: number, withholdingPct: number): string {
  return (net * (1 + (vatPct - withholdingPct) / 100)).toFixed(2);
}

/** Estimated gross from net salary and IRPF rate. Formula: net / (1 - irpf/100) */
export function estimateGross(netSalary: number, irpfRate: number): number {
  if (irpfRate <= 0) return netSalary;
  if (irpfRate >= 100) return netSalary;
  return netSalary / (1 - irpfRate / 100);
}

/** Stable idempotency key: setup2026:{category}:{person}:{YYYY-MM} */
export function makeTxId(category: string, person: string | null, month: string): string {
  return person
    ? `setup2026:${category}:${person}:${month}`
    : `setup2026:${category}:${month}`;
}

// ── Display helpers ───────────────────────────────────────────────────────────

const MONTH_NAMES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function monthLabel(month: string): string {
  const parts = month.split('-');
  const y = parts[0] ?? month;
  const mNum = Number(parts[1] ?? '1');
  return `${MONTH_NAMES[mNum - 1] ?? parts[1]} ${y}`;
}

function issueDate(month: string, day: number): string {
  const [y, m] = month.split('-') as [string, string];
  const lastDay = new Date(Number(y), Number(m), 0).getDate();
  const d = Math.min(day, lastDay);
  return `${y}-${m}-${String(d).padStart(2, '0')}`;
}

// ── Row generators ────────────────────────────────────────────────────────────

function generateNominaRows(
  personRaw: 'pablo' | 'alfonso',
  config: Setup2026HistoricalConfig['nomina']['pablo'],
): HistoricalExpenseRow[] {
  const net = Number(config.netSalary);
  const irpf = Number(config.irpfRate);
  const gross = estimateGross(net, irpf);
  const total = calcTotal(gross, 0, irpf);

  return config.months.map((month) => ({
    txId: makeTxId('nomina_socio', personRaw, month),
    include: true,
    issueDate: issueDate(month, 28),
    concept: `Nómina ${config.counterpartyName} — ${monthLabel(month)}`,
    counterpartyName: config.counterpartyName,
    netAmount: gross.toFixed(2),
    vatPct: '0.00',
    withholdingPct: irpf.toFixed(2),
    totalAmount: total,
    expenseGroup: 'operational' as const,
    expenseSubtype: 'nomina_socio',
    notes: `Neto empleado: ${net.toFixed(2)} EUR. Bruto estimado con IRPF ${irpf}%.`,
    label: `Nómina ${config.counterpartyName} ${monthLabel(month)}`,
    month,
    personKey: personRaw,
    categoryKey: 'nomina_socio' as CategoryKey,
  }));
}

function generateAutonomoRows(
  personRaw: 'pablo' | 'alfonso',
  config: Setup2026HistoricalConfig['autonomo']['pablo'],
): HistoricalExpenseRow[] {
  const amount = Number(config.amount) || 0;
  const conceptLabel = config.expenseSubtype === 'cuota_autonomo' ? 'Cuota autónomo' : 'Seguridad Social';

  return config.months.map((month) => ({
    txId: makeTxId(config.expenseSubtype, personRaw, month),
    include: true,
    issueDate: issueDate(month, 1),
    concept: `${conceptLabel} ${config.counterpartyName} — ${monthLabel(month)}`,
    counterpartyName: config.counterpartyName,
    netAmount: amount.toFixed(2),
    vatPct: '0.00',
    withholdingPct: '0.00',
    totalAmount: amount.toFixed(2),
    expenseGroup: 'operational' as const,
    expenseSubtype: config.expenseSubtype,
    notes: '',
    label: `${conceptLabel} ${config.counterpartyName} ${monthLabel(month)}`,
    month,
    personKey: personRaw,
    categoryKey: 'cuota_autonomo' as CategoryKey,
  }));
}

function generateGestoriaRows(config: Setup2026HistoricalConfig['gestoria']): HistoricalExpenseRow[] {
  const net = Number(config.amount);
  const vat = Number(config.vatPct);
  const w = Number(config.withholdingPct);

  return config.months.map((month) => ({
    txId: makeTxId('gestoria', null, month),
    include: true,
    issueDate: issueDate(month, 5),
    concept: `Gestoría — ${monthLabel(month)}`,
    counterpartyName: config.counterpartyName,
    netAmount: net.toFixed(2),
    vatPct: vat.toFixed(2),
    withholdingPct: w.toFixed(2),
    totalAmount: calcTotal(net, vat, w),
    expenseGroup: 'operational' as const,
    expenseSubtype: 'gestoria',
    notes: '',
    label: `Gestoría ${monthLabel(month)}`,
    month,
    personKey: null,
    categoryKey: 'gestoria' as CategoryKey,
  }));
}

function generateSeguroRows(config: Setup2026HistoricalConfig['seguro']): HistoricalExpenseRow[] {
  const amount = Number(config.amount);

  return config.months.map((month) => ({
    txId: makeTxId('seguro_medico', null, month),
    include: true,
    issueDate: issueDate(month, 1),
    concept: `Seguro médico — ${monthLabel(month)}`,
    counterpartyName: config.counterpartyName,
    netAmount: amount.toFixed(2),
    vatPct: '0.00',
    withholdingPct: '0.00',
    totalAmount: amount.toFixed(2),
    expenseGroup: 'operational' as const,
    expenseSubtype: 'seguro_medico',
    notes: '',
    label: `Seguro médico ${monthLabel(month)}`,
    month,
    personKey: null,
    categoryKey: 'seguro_medico' as CategoryKey,
  }));
}

/** Generates all proposed historical invoice rows from config. Pure, no DB calls. */
export function generateHistoricalRows(config: Setup2026HistoricalConfig): HistoricalExpenseRow[] {
  return [
    ...generateNominaRows('pablo', config.nomina.pablo),
    ...generateNominaRows('alfonso', config.nomina.alfonso),
    ...generateAutonomoRows('pablo', config.autonomo.pablo),
    ...generateAutonomoRows('alfonso', config.autonomo.alfonso),
    ...generateGestoriaRows(config.gestoria),
    ...generateSeguroRows(config.seguro),
  ];
}

/** Generates proposed recurring expense templates. Pure, no DB calls. */
export function generateRecurringTemplates(
  gestoria: Setup2026HistoricalConfig['gestoria'] & { startDate: string },
  seguro: Setup2026HistoricalConfig['seguro'] & { startDate: string },
): RecurringExpenseRow[] {
  const net = Number(gestoria.amount);
  const vat = Number(gestoria.vatPct);
  const w = Number(gestoria.withholdingPct);

  const gestoriaRow: RecurringExpenseRow = {
    key: 'setup2026:recurring:gestoria',
    include: true,
    name: 'Gestoría mensual',
    concept: 'Honorarios gestoría',
    counterpartyName: gestoria.counterpartyName,
    amount: net.toFixed(2),
    vatPct: vat.toFixed(2),
    withholdingPct: w.toFixed(2),
    expenseGroup: 'operational',
    expenseSubtype: 'gestoria',
    dayOfMonth: 5,
    startDate: gestoria.startDate,
    notes: '[setup2026:recurring:gestoria]',
    label: 'Template recurrente: Gestoría mensual',
    categoryKey: 'gestoria',
  };

  const seguroAmount = Number(seguro.amount);
  const seguroRow: RecurringExpenseRow = {
    key: 'setup2026:recurring:seguro_medico',
    include: true,
    name: 'Seguro médico mensual',
    concept: 'Prima seguro médico',
    counterpartyName: seguro.counterpartyName,
    amount: seguroAmount.toFixed(2),
    vatPct: '0.00',
    withholdingPct: '0.00',
    expenseGroup: 'operational',
    expenseSubtype: 'seguro_medico',
    dayOfMonth: 1,
    startDate: seguro.startDate,
    notes: '[setup2026:recurring:seguro_medico]',
    label: 'Template recurrente: Seguro médico mensual',
    categoryKey: 'seguro_medico',
  };

  return [gestoriaRow, seguroRow];
}

/** Summarizes included historical rows: totals by subtype, by month, EBITDA impact. */
export function summarize(rows: readonly HistoricalExpenseRow[]): Setup2026Summary {
  const included = rows.filter((r) => r.include);
  const totalBySubtype: Record<string, number> = {};
  const totalByMonth: Record<string, number> = {};
  let grandTotal = 0;
  let ebitdaImpact = 0;

  for (const row of included) {
    const net = Number(row.netAmount);
    const total = Number(row.totalAmount);

    totalBySubtype[row.expenseSubtype] = (totalBySubtype[row.expenseSubtype] ?? 0) + net;
    totalByMonth[row.month] = (totalByMonth[row.month] ?? 0) + total;
    grandTotal += total;
    ebitdaImpact += net;
  }

  return {
    totalBySubtype,
    totalByMonth,
    grandTotal: Math.round(grandTotal * 100) / 100,
    invoiceCount: included.length,
    ebitdaImpact: Math.round(ebitdaImpact * 100) / 100,
  };
}

// ── Default config ────────────────────────────────────────────────────────────

const JAN_MAR = ['2026-01', '2026-02', '2026-03'] as const;
const JAN_JUN = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'] as const;

export const DEFAULT_HISTORICAL_CONFIG: Setup2026HistoricalConfig = {
  nomina: {
    pablo: {
      netSalary: '1000.00',
      irpfRate: '22',
      months: JAN_MAR,
      counterpartyName: 'Pablo García',
    },
    alfonso: {
      netSalary: '1000.00',
      irpfRate: '6',
      months: JAN_MAR,
      counterpartyName: 'Alfonso',
    },
  },
  autonomo: {
    pablo: {
      amount: '',
      months: JAN_JUN,
      counterpartyName: 'RETA Pablo García',
      expenseSubtype: 'cuota_autonomo',
    },
    alfonso: {
      amount: '',
      months: JAN_JUN,
      counterpartyName: 'RETA Alfonso',
      expenseSubtype: 'cuota_autonomo',
    },
  },
  gestoria: {
    amount: '180.00',
    vatPct: '21.00',
    withholdingPct: '0.00',
    months: JAN_JUN,
    counterpartyName: 'Gestoría',
  },
  seguro: {
    amount: '54.00',
    months: JAN_JUN,
    counterpartyName: 'Aseguradora',
  },
};
