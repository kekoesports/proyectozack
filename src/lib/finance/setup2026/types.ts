export type PersonKey = 'pablo' | 'alfonso';

export type CategoryKey = 'nomina_socio' | 'cuota_autonomo' | 'gestoria' | 'seguro_medico';

// ── Row models ────────────────────────────────────────────────────────────────

export type HistoricalExpenseRow = {
  txId: string;
  include: boolean;
  issueDate: string;        // YYYY-MM-DD
  concept: string;
  counterpartyName: string;
  netAmount: string;        // base imponible (bruto para nóminas)
  vatPct: string;
  withholdingPct: string;
  totalAmount: string;      // auto-computed: net * (1 + (vat - w) / 100)
  expenseGroup: 'operational';
  expenseSubtype: string;
  notes: string;
  // display helpers
  label: string;
  month: string;            // YYYY-MM
  personKey: PersonKey | null;
  categoryKey: CategoryKey;
};

export type RecurringExpenseRow = {
  key: string;              // stable key for dedup, e.g. 'setup2026:gestoria'
  include: boolean;
  name: string;
  concept: string;
  counterpartyName: string;
  amount: string;
  vatPct: string;
  withholdingPct: string;
  expenseGroup: 'operational';
  expenseSubtype: string;
  dayOfMonth: number;
  startDate: string;        // YYYY-MM-DD
  notes: string;
  label: string;
  categoryKey: CategoryKey;
};

// ── Config types ──────────────────────────────────────────────────────────────

export type NominaPersonConfig = {
  readonly netSalary: string;        // neto mensual a cobrar
  readonly irpfRate: string;         // % como string, e.g. '22'
  readonly months: readonly string[]; // YYYY-MM
  readonly counterpartyName: string;
};

export type AutonomoConfig = {
  readonly amount: string;           // vacío por defecto, el admin lo rellena
  readonly months: readonly string[];
  readonly counterpartyName: string;
  readonly expenseSubtype: 'cuota_autonomo' | 'seguridad_social';
};

export type GestoriaConfig = {
  readonly amount: string;
  readonly vatPct: string;
  readonly withholdingPct: string;
  readonly months: readonly string[];
  readonly counterpartyName: string;
};

export type SeguroConfig = {
  readonly amount: string;
  readonly months: readonly string[];
  readonly counterpartyName: string;
};

export type Setup2026HistoricalConfig = {
  readonly nomina: {
    readonly pablo: NominaPersonConfig;
    readonly alfonso: NominaPersonConfig;
  };
  readonly autonomo: {
    readonly pablo: AutonomoConfig;
    readonly alfonso: AutonomoConfig;
  };
  readonly gestoria: GestoriaConfig;
  readonly seguro: SeguroConfig;
};

// ── Summary ───────────────────────────────────────────────────────────────────

export type Setup2026Summary = {
  readonly totalBySubtype: Record<string, number>;
  readonly totalByMonth: Record<string, number>;
  readonly grandTotal: number;
  readonly invoiceCount: number;
  readonly ebitdaImpact: number; // sum of netAmount (cost base)
};

// ── Apply result ──────────────────────────────────────────────────────────────

export type ApplyResult = {
  readonly invoicesCreated: number;
  readonly invoicesSkipped: number;
  readonly recurringCreated: number;
  readonly recurringSkipped: number;
};
