import { db } from '@/lib/db';
import { crmBrands, talents } from '@/db/schema';
import { asc } from 'drizzle-orm';
import { listInvoices, getInvoiceSummary, getUsedInvoiceCategories } from '@/lib/queries/invoices';
import { InvoicesManager } from '@/components/admin/invoices/InvoicesManager';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import Link from 'next/link';

function formatMoney(n: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

function monthRange(): { from: string; to: string; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const last = new Date(y, now.getMonth() + 1, 0).getDate();
  return {
    from: `${y}-${m}-01`,
    to: `${y}-${m}-${String(last).padStart(2, '0')}`,
    label: now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
  };
}

type FinanceCardProps = {
  readonly label: string;
  readonly value: string;
  readonly sub?: string | undefined;
  readonly accent: string;
  readonly subAccent?: string | undefined;
};

function FinanceCard({ label, value, sub, accent, subAccent }: FinanceCardProps): React.ReactElement {
  return (
    <div className="rounded-lg bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="h-[2px]" style={{ background: accent }} />
      <div className="px-4 py-3">
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-sp-admin-muted leading-none">{label}</p>
        <p className="text-lg font-bold tabular-nums mt-1 leading-none" style={{ color: accent }}>{value}</p>
        {sub && (
          <p className="text-[9px] font-semibold mt-1" style={{ color: subAccent ?? '#ef4444' }}>{sub}</p>
        )}
      </div>
    </div>
  );
}

export default async function AdminInvoicesPage(): Promise<React.ReactElement> {
  const month = monthRange();

  const [invoices, summaryMonth, summaryYTD, brandsList, talentsList, categories] = await Promise.all([
    listInvoices(),
    getInvoiceSummary(month.from, month.to),
    getInvoiceSummary(`${new Date().getFullYear()}-01-01`),
    db.select({ id: crmBrands.id, name: crmBrands.name }).from(crmBrands).orderBy(asc(crmBrands.name)),
    db.select({ id: talents.id, name: talents.name }).from(talents).orderBy(asc(talents.name)),
    getUsedInvoiceCategories(),
  ]);

  const incomeCount = invoices.filter((i) => i.kind === 'income').length;
  const expenseCount = invoices.filter((i) => i.kind === 'expense').length;

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Facturación"
        subtitle={`Vista mensual: ${month.label}`}
        stats={[
          { label: 'ingresos', value: incomeCount, accent: '#16a34a' },
          { label: 'gastos', value: expenseCount, accent: '#f59e0b' },
          { label: 'total', value: invoices.length },
        ]}
        actions={[
          { label: 'Importar', href: '/admin/facturacion/import' },
          { label: 'Exportar fiscal', href: '/admin/facturacion/exports' },
        ]}
      />

      {/* KPIs del mes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <FinanceCard
          label="Ingresos del mes"
          value={formatMoney(summaryMonth.incomeTotal)}
          accent="#16a34a"
        />
        <FinanceCard
          label="Gastos del mes"
          value={formatMoney(summaryMonth.expenseTotal)}
          accent="#f59e0b"
        />
        <FinanceCard
          label="Neto del mes"
          value={formatMoney(summaryMonth.netTotal)}
          accent={summaryMonth.netTotal >= 0 ? '#16a34a' : '#ef4444'}
        />
        <FinanceCard
          label="Pendiente cobro"
          value={formatMoney(summaryMonth.pendingIncome)}
          sub={summaryMonth.overdueIncome > 0 ? `${formatMoney(summaryMonth.overdueIncome)} vencido` : undefined}
          accent="#5b9bd5"
          subAccent="#ef4444"
        />
      </div>

      {/* KPIs YTD */}
      <div className="grid grid-cols-3 gap-2">
        <FinanceCard label={`Ingresos ${new Date().getFullYear()}`} value={formatMoney(summaryYTD.incomeTotal)} accent="#16a34a" />
        <FinanceCard label={`Gastos ${new Date().getFullYear()}`} value={formatMoney(summaryYTD.expenseTotal)} accent="#f59e0b" />
        <FinanceCard
          label={`Neto ${new Date().getFullYear()}`}
          value={formatMoney(summaryYTD.netTotal)}
          accent={summaryYTD.netTotal >= 0 ? '#16a34a' : '#ef4444'}
        />
      </div>

      <InvoicesManager
        invoices={invoices}
        brands={brandsList}
        talents={talentsList}
        categories={categories}
      />
    </div>
  );
}
