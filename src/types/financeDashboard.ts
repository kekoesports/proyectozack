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
  //
  // Cobrado y pagado son direcciones distintas del mismo movimiento: un pago a
  // un talento es una fila de `invoice_payments` igual que un cobro de una
  // marca. Sumarlas juntas hacía que conciliar bien subiera el "cobrado".
  readonly cobradoRealMes: number;
  readonly pagadoRealMes: number;
  /** Caja neta del mes: cobrado − pagado. Ambas ramas en caja, sin devengo. */
  readonly netoRealMes: number;
  // Bank reconciliation
  readonly pendingApplyPayment: number;
  readonly unconciliatedMovements: number;
};

/**
 * Un mes de la serie de tesorería.
 *
 * Las dos primeras magnitudes son caja y la tercera es devengo, y llevan
 * nombres distintos por eso: antes ambas se llamaban `cobrado`/`pagado` y
 * restarlas daba un "neto" que mezclaba criterios — cobros reales menos gastos
 * facturados, algunos ni pagados todavía.
 *
 * Mientras no haya extractos importados las dos ramas de caja valen 0. Es la
 * respuesta correcta: no se ha cobrado nada *que conste*.
 */
export type CashflowMonthPoint = {
  readonly month: string; // 'YYYY-MM'
  /** Caja: cobros aplicados en el mes (solo dirección ingreso). */
  readonly cobrado: number;
  /** Caja: pagos aplicados en el mes (solo dirección gasto). */
  readonly pagadoCaja: number;
  /** Devengo: facturas de gasto con fecha en el mes, pagadas o no. */
  readonly pagadoDevengo: number;
  /** Caja neta del mes. Cobrado − pagado, ambas en caja. */
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
