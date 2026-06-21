import type {
  CampaignMarginRow,
  FinanceAlert,
  FinanceDashboardKPIs,
  ReceivableRow,
  ReconciliationSummary,
} from '@/types/financeDashboard';

// Pura derivación en memoria — sin queries adicionales
export function deriveAlerts(opts: {
  kpis: FinanceDashboardKPIs;
  receivables: readonly ReceivableRow[];
  reconciliation: ReconciliationSummary;
  campaigns: readonly CampaignMarginRow[];
}): readonly FinanceAlert[] {
  const { kpis, receivables, reconciliation, campaigns } = opts;
  const alerts: FinanceAlert[] = [];

  // Facturas vencidas
  const overdueRows = receivables.filter((r) => r.isOverdue);
  if (overdueRows.length > 0) {
    const total = overdueRows.reduce((sum, r) => sum + r.pendingAmount, 0);
    alerts.push({
      type: 'overdue_receivable',
      severity: total > 5000 ? 'high' : 'medium',
      message: `${overdueRows.length} factura${overdueRows.length > 1 ? 's' : ''} vencida${overdueRows.length > 1 ? 's' : ''} por cobrar`,
      count: overdueRows.length,
      amount: total,
    });
  }

  // Campañas con margen bajo
  const lowMarginCampaigns = campaigns.filter((c) => c.isLow);
  if (lowMarginCampaigns.length > 0) {
    alerts.push({
      type: 'low_margin',
      severity: 'medium',
      message: `${lowMarginCampaigns.length} campaña${lowMarginCampaigns.length > 1 ? 's' : ''} con margen < 20%`,
      count: lowMarginCampaigns.length,
    });
  }

  // Cobros conciliados pendientes de aplicar
  if (kpis.pendingApplyPayment > 0) {
    alerts.push({
      type: 'pending_apply_payment',
      severity: kpis.pendingApplyPayment > 5 ? 'high' : 'low',
      message: `${kpis.pendingApplyPayment} cobro${kpis.pendingApplyPayment > 1 ? 's' : ''} conciliado${kpis.pendingApplyPayment > 1 ? 's' : ''} sin aplicar a factura`,
      count: kpis.pendingApplyPayment,
    });
  }

  // Movimientos bancarios sin conciliar
  if (reconciliation.importedUnmatched > 0) {
    alerts.push({
      type: 'unreconciled',
      severity: reconciliation.importedUnmatched > 20 ? 'medium' : 'low',
      message: `${reconciliation.importedUnmatched} movimiento${reconciliation.importedUnmatched > 1 ? 's' : ''} bancario${reconciliation.importedUnmatched > 1 ? 's' : ''} sin conciliar`,
      count: reconciliation.importedUnmatched,
    });
  }

  return alerts.sort((a, b) => {
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });
}
