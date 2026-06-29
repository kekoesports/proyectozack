export type FilenameWarning = {
  readonly filenameMonth: string;   // e.g. "febrero 2026"
  readonly detectedPeriod: string;  // e.g. "enero 2026"
};

export type ParsedPayrollPage = {
  readonly page: number;
  readonly employeeName: string | null;
  readonly costoEmpresa: number | null;
  readonly liquidoPercibir: number | null;
  readonly yearMonth: string | null; // YYYY-MM
  readonly issueDate: string | null; // YYYY-MM-DD
  readonly irpfPct: number | null;
  readonly totalDevengado: number | null;
  readonly totalDeducciones: number | null;
  readonly warnings: readonly string[];
};

export type PayrollImportRow = {
  readonly page: number;
  readonly include: boolean;
  readonly slug: string;
  readonly yearMonth: string;
  readonly txId: string;
  readonly counterpartyName: string;
  readonly concept: string;
  readonly issueDate: string;
  readonly netAmount: string;
  readonly totalAmount: string;
  readonly vatPct: string;
  readonly withholdingPct: string;
  readonly expenseGroup: 'operational';
  readonly expenseSubtype: 'nomina_socio';
  readonly status: 'pagada';
  readonly notes: string | null;
  readonly warning: string | null;
};

export type PayrollApplyResult = {
  readonly invoicesCreated: number;
  readonly invoicesSkipped: number;
};
