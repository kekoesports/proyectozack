import { db } from '@/lib/db';
import { campaigns, crmBrands, talents } from '@/db/schema';
import { asc, eq, isNull } from 'drizzle-orm';
import { requireAnyRole } from '@/lib/auth-guard';
import { canDelete } from '@/lib/permissions';
import { listInvoices, getBillingKPIs, getUsedInvoiceCategories } from '@/lib/queries/invoices';
import { InvoicesManager } from '@/features/admin/invoices/components/InvoicesManager';

import type { Role } from '@/lib/auth-guard';

function formatMoney(n: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

type KpiCardProps = {
  readonly label: string;
  readonly value: string;
  readonly accent: string;
  readonly sub?: string | undefined;
  readonly subAccent?: string | undefined;
};

function KpiCard({ label, value, accent, sub, subAccent }: KpiCardProps): React.ReactElement {
  return (
    <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="h-[2px]" style={{ background: accent }} />
      <div className="px-4 py-3">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sp-admin-muted leading-none">{label}</p>
        <p className="text-[17px] font-bold tabular-nums mt-1.5 leading-none" style={{ color: accent }}>{value}</p>
        {sub && (
          <p className="text-[9px] font-semibold mt-1 leading-none" style={{ color: subAccent ?? '#6b7280' }}>{sub}</p>
        )}
      </div>
    </div>
  );
}

export default async function AdminInvoicesPage(): Promise<React.ReactElement> {
  const session = await requireAnyRole(['admin', 'manager'], '/admin/login');
  const role = (session.user.role ?? 'staff') as Role;

  const yearStart = `${new Date().getFullYear()}-01-01`;

  const [invoices, kpis, brandsList, talentsList, campaignsRows, categories] = await Promise.all([
    listInvoices(),
    getBillingKPIs(yearStart),
    db.select({ id: crmBrands.id, name: crmBrands.name }).from(crmBrands).orderBy(asc(crmBrands.name)),
    db.select({ id: talents.id, name: talents.name }).from(talents).orderBy(asc(talents.name)),
    db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        brandName: crmBrands.name,
        talentName: talents.name,
      })
      .from(campaigns)
      .innerJoin(crmBrands, eq(crmBrands.id, campaigns.brandId))
      .innerJoin(talents, eq(talents.id, campaigns.talentId))
      .where(isNull(campaigns.archivedAt))
      .orderBy(asc(campaigns.name)),
    getUsedInvoiceCategories(),
  ]);

  const campaignOptions = campaignsRows.map((c) => ({
    id: c.id,
    label: `${c.brandName} × ${c.talentName} — ${c.name}`,
  }));
  const incomeCount = invoices.filter((i) => i.kind === 'income').length;
  const expenseCount = invoices.filter((i) => i.kind === 'expense').length;
  const year = new Date().getFullYear();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-sp-admin-text leading-none">Facturación</h1>
          <p className="text-[11px] text-sp-admin-muted mt-1">Control de ingresos, gastos, cobros y pagos</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-sp-admin-muted">
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            <strong className="text-sp-admin-text">{incomeCount}</strong> ingresos
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
            <strong className="text-sp-admin-text">{expenseCount}</strong> gastos
          </span>
          <span className="text-sp-admin-muted/50">·</span>
          <span className="text-sp-admin-muted/70">{year}</span>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        <KpiCard
          label="Ingresos totales"
          value={formatMoney(kpis.incomeTotal)}
          accent="#16a34a"
        />
        <KpiCard
          label="Gastos totales"
          value={formatMoney(kpis.expenseTotal)}
          accent="#f59e0b"
        />
        <KpiCard
          label="Margen neto"
          value={formatMoney(kpis.netTotal)}
          accent={kpis.netTotal >= 0 ? '#16a34a' : '#ef4444'}
          sub={kpis.netTotal < 0 ? 'Gastos superiores a ingresos' : undefined}
          subAccent="#ef4444"
        />
        <KpiCard
          label="Pendiente cobro"
          value={formatMoney(kpis.pendingCobro)}
          accent="#5b9bd5"
          sub={kpis.pendingCobro > 0 ? 'Ingresos sin cobrar' : undefined}
          subAccent="#f59e0b"
        />
        <KpiCard
          label="Pendiente pago"
          value={formatMoney(kpis.pendingPago)}
          accent="#e03070"
          sub={kpis.pendingPago > 0 ? 'Gastos sin pagar' : undefined}
          subAccent="#f59e0b"
        />
      </div>

      {/* KPIs desglose */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiCard
          label="Ingresos en banco"
          value={formatMoney(kpis.ingresosBanco)}
          accent="#059669"
        />
        <KpiCard
          label="Ingresos en crypto"
          value={formatMoney(kpis.ingresosCrypto)}
          accent="#7c3aed"
        />
        <KpiCard
          label="Gastos empresa"
          value={formatMoney(kpis.gastoEmpresa)}
          accent="#d97706"
        />
        <KpiCard
          label="Gastos creadores"
          value={formatMoney(kpis.gastoCreador)}
          accent="#dc2626"
        />
      </div>

      <InvoicesManager
        invoices={invoices}
        brands={brandsList}
        talents={talentsList}
        campaigns={campaignOptions}
        categories={categories}
        canDelete={canDelete(role)}
      />
    </div>
  );
}
