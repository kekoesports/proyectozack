import { requirePermission } from '@/lib/permissions';
import { getFinanceDashboard } from '@/lib/queries/financeDashboard';
import { FinanceKPIGrid } from '@/features/admin/finance-dashboard/components/FinanceKPIGrid';
import { CashflowChart } from '@/features/admin/finance-dashboard/components/CashflowChart';
import { ReceivablesTable } from '@/features/admin/finance-dashboard/components/ReceivablesTable';
import { ReconciliationPanel } from '@/features/admin/finance-dashboard/components/ReconciliationPanel';
import { CampaignMarginsTable } from '@/features/admin/finance-dashboard/components/CampaignMarginsTable';
import { FinanceAlertsList } from '@/features/admin/finance-dashboard/components/FinanceAlertsList';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard Financiero · SocialPro Admin',
};

export default async function FinanceDashboardPage() {
  await requirePermission('facturacion', 'read');

  const data = await getFinanceDashboard();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-sp-admin-fg">Dashboard Financiero</h1>
          <p className="text-sm text-sp-admin-muted">
            Solo lectura · Accrual + Cash real · Sin conexiones bancarias externas
          </p>
        </div>
      </div>

      {data.alerts.length > 0 && (
        <section aria-label="Alertas financieras">
          <FinanceAlertsList alerts={data.alerts} />
        </section>
      )}

      <section aria-label="KPIs financieros">
        <FinanceKPIGrid kpis={data.kpis} />
      </section>

      <section aria-label="Cashflow mensual">
        <CashflowChart data={data.cashflow} />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ReceivablesTable rows={data.receivables} />
        </div>
        <div>
          <ReconciliationPanel data={data.reconciliation} />
        </div>
      </div>

      <section aria-label="Márgenes de campañas">
        <CampaignMarginsTable rows={data.campaigns} />
      </section>
    </div>
  );
}
