import { requirePermission } from '@/lib/permissions';
import {
  getMonthlyFinanceFlow,
  getFinanceStockKPIs,
  getMonthlyExpenseBreakdown,
  getMonthlyDocs,
  parseYearMonth,
  monthRange,
} from '@/lib/queries/financeDashboard/financeResumen';
import { getFinanceDashboard } from '@/lib/queries/financeDashboard';
import { FinanceMonthlyControl } from '@/features/admin/finance-dashboard/components/FinanceMonthlyControl';

export const metadata = { title: 'Finanzas' };

type PageProps = {
  readonly searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FinanzasResumenPage({ searchParams }: PageProps): Promise<React.ReactElement> {
  await requirePermission('facturacion', 'read');

  const sp = (await searchParams) ?? {};
  const rawMes = Array.isArray(sp.mes) ? sp.mes[0] : sp.mes;
  const mes = parseYearMonth(rawMes);
  const { from, to } = monthRange(mes);

  const [flow, stock, breakdown, docs, dashboard] = await Promise.all([
    getMonthlyFinanceFlow(from, to),
    getFinanceStockKPIs(),
    getMonthlyExpenseBreakdown(from, to),
    getMonthlyDocs(from, to),
    getFinanceDashboard(),
  ]);

  return (
    <div className="space-y-6 pt-2">
      <FinanceMonthlyControl
        mes={mes}
        flow={flow}
        stock={stock}
        breakdown={breakdown}
        docs={docs}
        alerts={dashboard.alerts}
        receivables={dashboard.receivables}
      />
    </div>
  );
}
