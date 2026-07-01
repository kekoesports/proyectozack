'server-only';

import { getCashflowSeries } from './cashflow';
import { getFinanceDashboardKPIs } from './kpis';
import { getReceivables } from './receivables';
import { getReconciliationSummary } from './reconciliation';
import { getCampaignMargins } from './campaignMargins';
import { deriveAlerts } from './alerts';
import type { FinanceDashboardData } from '@/types/financeDashboard';

export async function getFinanceDashboard(): Promise<FinanceDashboardData> {
  const [kpis, cashflow, receivables, reconciliation, campaigns] = await Promise.all([
    getFinanceDashboardKPIs(),
    getCashflowSeries(12),
    getReceivables(),
    getReconciliationSummary(),
    getCampaignMargins(),
  ]);

  const alerts = deriveAlerts({ kpis, receivables, reconciliation, campaigns });

  return { kpis, cashflow, receivables, reconciliation, campaigns, alerts };
}

export { getCashflowSeries } from './cashflow';
export { getFinanceDashboardKPIs } from './kpis';
export { getReceivables } from './receivables';
export { getReconciliationSummary } from './reconciliation';
export { getCampaignMargins, LOW_MARGIN_THRESHOLD } from './campaignMargins';
export { deriveAlerts } from './alerts';
export {
  getFinanceResumenKPIs,
  getMonthlyFinanceFlow,
  getFinanceStockKPIs,
  getMonthlyExpenseBreakdown,
  getMonthlyDocs,
  parseYearMonth,
  monthRange,
  currentYearMonth,
  buildContextualText,
  EXPENSE_SUBTYPE_LABELS,
} from './financeResumen';
export type {
  FinanceResumenKPIs,
  MonthlyFinanceFlow,
  FinanceStockKPIs,
  MonthlyExpenseBreakdownItem,
  MonthlyDocItem,
} from './financeResumen';
export { getFinancePnL } from './pnlDetail';
export type { FinancePnLResult } from './pnlDetail';
export { getArAging } from './arAging';
