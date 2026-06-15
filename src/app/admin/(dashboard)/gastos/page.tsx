import { db } from '@/lib/db';
import { crmBrands, talents, campaigns } from '@/db/schema';
import { asc } from 'drizzle-orm';
import { listInvoices, getBillingKPIs, getUsedInvoiceCategories } from '@/lib/queries/invoices';
import { InvoicesManager } from '@/features/admin/invoices/components/InvoicesManager';
import { requirePermission, canDelete } from '@/lib/permissions';

export const metadata = { title: 'Gastos | Admin' };

function fmt(n: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

type KpiCardProps = {
  readonly label:   string;
  readonly value:   string;
  readonly accent:  string;
  readonly sub?:    string | undefined;
};

function KpiCard({ label, value, accent, sub }: KpiCardProps): React.ReactElement {
  return (
    <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="h-[2px]" style={{ background: accent }} />
      <div className="px-4 py-3">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sp-admin-muted leading-none">{label}</p>
        <p className="text-[17px] font-bold tabular-nums mt-1.5 leading-none" style={{ color: accent }}>{value}</p>
        {sub !== undefined && (
          <p className="text-[9px] font-semibold mt-1 leading-none text-sp-admin-muted">{sub}</p>
        )}
      </div>
    </div>
  );
}

export default async function AdminGastosPage(): Promise<React.ReactElement> {
  const session = await requirePermission('facturacion', 'read');
  const role    = session.user.role;
  const isStaff = role === 'staff';

  const yearStart = `${new Date().getFullYear()}-01-01`;

  const [expenses, kpis, brandsList, talentsList, campaignsList, categories] = await Promise.all([
    listInvoices(isStaff ? { kind: 'expense', staffUserId: session.user.id } : { kind: 'expense' }),
    getBillingKPIs(yearStart),
    db.select({ id: crmBrands.id, name: crmBrands.name }).from(crmBrands).orderBy(asc(crmBrands.name)),
    db.select({ id: talents.id, name: talents.name }).from(talents).orderBy(asc(talents.name)),
    db.select({ id: campaigns.id, name: campaigns.name, brandId: campaigns.brandId, talentId: campaigns.talentId })
      .from(campaigns).orderBy(asc(campaigns.name)),
    getUsedInvoiceCategories(),
  ]);

  const campanaRatio = kpis.expenseTotal > 0
    ? `${((kpis.gastosCampana / kpis.expenseTotal) * 100).toFixed(0)}% del total`
    : undefined;
  const empresaRatio = kpis.expenseTotal > 0
    ? `${((kpis.gastosEmpresa / kpis.expenseTotal) * 100).toFixed(0)}% del total`
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-sp-admin-text leading-none">Gastos</h1>
          <p className="text-[11px] text-sp-admin-muted mt-1">
            {expenses.length} movimiento{expenses.length !== 1 ? 's' : ''} · año {new Date().getFullYear()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiCard
          label="Gastos totales"
          value={fmt(kpis.expenseTotal)}
          accent="#f59e0b"
        />
        <KpiCard
          label="Pendiente de pago"
          value={fmt(kpis.pendingPago)}
          accent="#ef4444"
          {...(kpis.pendingPago > 0 ? { sub: 'Sin liquidar' } : {})}
        />
        <KpiCard
          label="Gastos campaña"
          value={fmt(kpis.gastosCampana)}
          accent="#d97706"
          {...(campanaRatio !== undefined ? { sub: campanaRatio } : {})}
        />
        <KpiCard
          label="Gastos empresa"
          value={fmt(kpis.gastosEmpresa)}
          accent="#7c3aed"
          {...(empresaRatio !== undefined ? { sub: empresaRatio } : {})}
        />
      </div>

      <InvoicesManager
        invoices={expenses}
        brands={brandsList}
        talents={talentsList}
        campaigns={campaignsList.map((c) => ({ id: c.id, label: c.name, brandId: c.brandId, talentId: c.talentId }))}
        categories={categories}
        canDelete={canDelete(role)}
        isStaff={isStaff}
      />
    </div>
  );
}
