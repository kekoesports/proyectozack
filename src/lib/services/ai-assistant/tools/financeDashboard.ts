'server-only';

import { getFinanceDashboardKPIs } from '@/lib/queries/financeDashboard/kpis';
import { getCashflowSeries } from '@/lib/queries/financeDashboard/cashflow';
import { getReceivables } from '@/lib/queries/financeDashboard/receivables';
import { getCampaignMargins } from '@/lib/queries/financeDashboard/campaignMargins';
import { getReconciliationSummary } from '@/lib/queries/financeDashboard/reconciliation';
import { deriveAlerts } from '@/lib/queries/financeDashboard/alerts';

export async function getFinanceDashboardSummary() {
  const [kpis, reconciliation] = await Promise.all([
    getFinanceDashboardKPIs(),
    getReconciliationSummary(),
  ]);
  return {
    accrual: {
      incomeTotal: kpis.incomeTotal,
      expenseTotal: kpis.expenseTotal,
      netTotal: kpis.netTotal,
      beneficioNeto: kpis.beneficioNeto,
      pendingCobro: kpis.pendingCobro,
      pendingPago: kpis.pendingPago,
    },
    cash: {
      cobradoRealMes: kpis.cobradoRealMes,
    },
    bank: {
      unconciliatedMovements: kpis.unconciliatedMovements,
      pendingApplyPayment: kpis.pendingApplyPayment,
      matched: reconciliation.matched,
      needsReview: reconciliation.needsReview,
    },
  };
}

export async function getCashflowTrend() {
  const series = await getCashflowSeries(12);
  return {
    note: 'cobrado=cash real (invoice_payments), pagado=devengado (invoices expense)',
    series,
  };
}

export async function getReceivablesRiskSummary() {
  const rows = await getReceivables();
  const overdue = rows.filter((r) => r.isOverdue);
  const pending = rows.filter((r) => !r.isOverdue);
  const totalOverdue = overdue.reduce((s, r) => s + r.pendingAmount, 0);
  const totalPending = pending.reduce((s, r) => s + r.pendingAmount, 0);
  return {
    overdueCount: overdue.length,
    overdueAmount: totalOverdue,
    pendingCount: pending.length,
    pendingAmount: totalPending,
    top5Overdue: overdue.slice(0, 5).map((r) => ({
      invoiceNumber: r.invoiceNumber,
      clientName: r.clientName,
      pendingAmount: r.pendingAmount,
      dueDate: r.dueDate,
    })),
  };
}

export async function getCampaignMarginAlerts() {
  const campaigns = await getCampaignMargins();
  const low = campaigns.filter((c) => c.isLow);
  return {
    totalCampaigns: campaigns.length,
    lowMarginCount: low.length,
    lowMarginCampaigns: low.map((c) => ({
      id: c.id,
      name: c.name,
      brandName: c.brandName,
      computedMarginPct: c.computedMarginPct,
      cobroConfirmado: c.cobroConfirmado,
    })),
  };
}

export async function getFinanceAlerts() {
  const [kpis, receivables, reconciliation, campaigns] = await Promise.all([
    getFinanceDashboardKPIs(),
    getReceivables(),
    getReconciliationSummary(),
    getCampaignMargins(),
  ]);
  return deriveAlerts({ kpis, receivables, reconciliation, campaigns });
}
