export type FinanceDashboardKPIs = {
  // Accrual basis (invoices table)
  readonly incomeTotal: number;
  readonly expenseTotal: number;
  readonly netTotal: number;
  readonly pendingCobro: number;
  readonly pendingPago: number;
  readonly gastosCampana: number;
  readonly gastosEmpresa: number;
  readonly beneficioNeto: number;
  // Cash basis (invoice_payments)
  readonly cobradoRealMes: number;
  // Bank reconciliation
  readonly pendingApplyPayment: number;
  readonly unconciliatedMovements: number;
};

export type CashflowMonthPoint = {
  readonly month: string; // 'YYYY-MM'
  readonly cobrado: number; // cash receipts (invoice_payments)
  readonly pagado: number; // expense invoices accrual (invoices kind=expense)
  readonly neto: number;
};

export type ReceivableRow = {
  readonly id: number;
  readonly source: 'issued' | 'internal';
  readonly invoiceNumber: string;
  readonly clientName: string | null;
  readonly totalAmount: number;
  readonly paidAmount: number;
  readonly pendingAmount: number;
  readonly status: string;
  readonly dueDate: string | null;
  readonly isOverdue: boolean;
};

export type CampaignMarginRow = {
  readonly id: number;
  readonly name: string;
  readonly brandName: string | null;
  readonly talentName: string | null;
  readonly status: string;
  readonly amountBrand: number;
  readonly amountTalent: number;
  readonly computedMarginPct: number | null;
  readonly isLow: boolean; // < 20%
  readonly cobroConfirmado: boolean;
  readonly pagoTalentConfirmado: boolean;
};

export type ReconciliationSummary = {
  readonly totalTransactions: number;
  readonly importedUnmatched: number;
  readonly matched: number;
  readonly needsReview: number;
  readonly pendingApplyPayment: number;
};

export type FinanceAlertType =
  | 'overdue_receivable'
  | 'low_margin'
  | 'pending_apply_payment'
  | 'unreconciled';

export type FinanceAlertSeverity = 'high' | 'medium' | 'low';

export type FinanceAlert = {
  readonly type: FinanceAlertType;
  readonly severity: FinanceAlertSeverity;
  readonly message: string;
  readonly count?: number;
  readonly amount?: number;
};

export type FinanceDashboardData = {
  readonly kpis: FinanceDashboardKPIs;
  readonly cashflow: readonly CashflowMonthPoint[];
  readonly receivables: readonly ReceivableRow[];
  readonly reconciliation: ReconciliationSummary;
  readonly campaigns: readonly CampaignMarginRow[];
  readonly alerts: readonly FinanceAlert[];
};
