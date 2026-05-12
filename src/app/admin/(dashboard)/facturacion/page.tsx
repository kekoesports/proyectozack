import Link from 'next/link';
import { db } from '@/lib/db';
import { crmBrands, talents, campaigns } from '@/db/schema';
import { asc } from 'drizzle-orm';
import { listInvoices, getBillingKPIs, getUsedInvoiceCategories } from '@/lib/queries/invoices';
import { countPendingImports } from '@/lib/queries/invoiceImports';
import { getIssuerCompanies, getBillingClients, listIssuedInvoices } from '@/lib/queries/issuedInvoices';
import { InvoicesManager }          from '@/features/admin/invoices/components/InvoicesManager';
import { IssuedInvoicesTab }         from '@/features/admin/invoices/components/IssuedInvoicesTab';
import { AccountingImporter }        from '@/features/admin/invoices/components/AccountingImporter';
import { BillingClientsManager }     from '@/features/admin/invoices/components/BillingClientsManager';
import { IssuersManagerTab }         from '@/features/admin/invoices/components/IssuersManagerTab';
import { BrandsTabs }                from '@/features/admin/brands/components/BrandsTabs';
import { requirePermission } from '@/lib/permissions';
import { canDelete } from '@/lib/permissions';


export const metadata = { title: 'Facturación | Admin' };

function fmt(n: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

type KpiCardProps = {
  readonly label:     string;
  readonly value:     string;
  readonly accent:    string;
  readonly sub?:      string | undefined;
  readonly subAccent?: string | undefined;
};

function KpiCard({ label, value, accent, sub, subAccent }: KpiCardProps): React.ReactElement {
  return (
    <div className="rounded-xl bg-sp-admin-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="h-[2px]" style={{ background: accent }} />
      <div className="px-4 py-3">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sp-admin-muted leading-none">{label}</p>
        <p className="text-[17px] font-bold tabular-nums mt-1.5 leading-none" style={{ color: accent }}>{value}</p>
        {sub && <p className="text-[9px] font-semibold mt-1 leading-none" style={{ color: subAccent ?? '#6b7280' }}>{sub}</p>}
      </div>
    </div>
  );
}

export default async function AdminInvoicesPage(): Promise<React.ReactElement> {
  const session = await requirePermission('facturacion', 'read');
  const role    = session.user.role;
  const isStaff = role === 'staff';

  const yearStart = `${new Date().getFullYear()}-01-01`;

  const [
    movements, kpis, brandsList, talentsList, campaignsList,
    issuers, billingClients, issuedInvList, categories, pendingImports,
  ] = await Promise.all([
    listInvoices(isStaff ? { staffUserId: session.user.id } : {}),
    getBillingKPIs(yearStart),
    db.select({ id: crmBrands.id, name: crmBrands.name }).from(crmBrands).orderBy(asc(crmBrands.name)),
    db.select({ id: talents.id, name: talents.name }).from(talents).orderBy(asc(talents.name)),
    db.select({
      id: campaigns.id, name: campaigns.name,
      brandId: campaigns.brandId, talentId: campaigns.talentId,
      amountBrand: campaigns.amountBrand, amountTalent: campaigns.amountTalent,
    }).from(campaigns).orderBy(asc(campaigns.name)),
    getIssuerCompanies(),
    getBillingClients(),
    listIssuedInvoices(isStaff ? { staffUserId: session.user.id } : {}),
    getUsedInvoiceCategories(),
    countPendingImports(),
  ]);

  const incomeCount  = movements.filter((i) => i.kind === 'income').length;
  const expenseCount = movements.filter((i) => i.kind === 'expense').length;
  const year = new Date().getFullYear();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-sp-admin-text leading-none">Facturación</h1>
          <p className="text-[11px] text-sp-admin-muted mt-1">Movimientos financieros y facturas emitidas</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-sp-admin-muted">
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

      <BrandsTabs
        defaultKey="movimientos"
        tabs={[
          {
            key:   'movimientos',
            label: 'Movimientos',
            content: (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                  <KpiCard label="Ingresos totales"  value={fmt(kpis.incomeTotal)}  accent="#16a34a" />
                  <KpiCard label="Gastos totales"    value={fmt(kpis.expenseTotal)} accent="#f59e0b" />
                  <KpiCard label="Margen neto"       value={fmt(kpis.netTotal)}     accent={kpis.netTotal >= 0 ? '#16a34a' : '#ef4444'}
                    sub={kpis.netTotal < 0 ? 'Gastos superiores a ingresos' : undefined} subAccent="#ef4444" />
                  <KpiCard label="Pendiente cobro"   value={fmt(kpis.pendingCobro)} accent="#5b9bd5"
                    sub={kpis.pendingCobro > 0 ? 'Ingresos sin cobrar' : undefined} subAccent="#f59e0b" />
                  <KpiCard label="Pendiente pago"    value={fmt(kpis.pendingPago)}  accent="#e03070"
                    sub={kpis.pendingPago > 0 ? 'Gastos sin pagar' : undefined} subAccent="#f59e0b" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <KpiCard label="Ingresos en banco"  value={fmt(kpis.ingresosBanco)}  accent="#059669" />
                  <KpiCard label="Ingresos en crypto" value={fmt(kpis.ingresosCrypto)} accent="#7c3aed" />
                  <KpiCard label="Gastos empresa"     value={fmt(kpis.gastoEmpresa)}   accent="#d97706" />
                  <KpiCard label="Gastos creadores"   value={fmt(kpis.gastoCreador)}   accent="#dc2626" />
                </div>
                <InvoicesManager
                  invoices={movements}
                  brands={brandsList}
                  talents={talentsList}
                  campaigns={campaignsList.map((c) => ({ id: c.id, label: c.name, brandId: c.brandId, talentId: c.talentId }))}
                  categories={categories}
                  canDelete={canDelete(role)}
                  isStaff={isStaff}
                />
              </div>
            ),
          },
          {
            key:   'importar',
            label: 'Importar datos',
            content: (
              <div className="space-y-6">
                {/* PDF invoice import card */}
                <Link
                  href="/admin/facturacion/import"
                  className="flex items-center justify-between gap-4 rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5 hover:border-sp-admin-accent/40 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-sp-admin-accent/10 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-sp-admin-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-sp-admin-text group-hover:text-sp-admin-accent transition-colors">
                        Importar factura PDF
                      </p>
                      <p className="text-xs text-sp-admin-muted mt-0.5">
                        Sube una factura en PDF — la IA extrae los datos automáticamente
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {pendingImports > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/15 text-amber-400 text-[11px] font-semibold">
                        {pendingImports} pendiente{pendingImports !== 1 ? 's' : ''}
                      </span>
                    )}
                    <svg className="w-4 h-4 text-sp-admin-muted group-hover:text-sp-admin-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  </div>
                </Link>

                {/* Excel / CSV importer (unchanged) */}
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-3">Importar desde Excel / CSV</p>
                  <AccountingImporter />
                </div>
              </div>
            ),
          },
          {
            key:   'facturas',
            label: 'Facturas emitidas',
            content: (
              <IssuedInvoicesTab
                invoices={issuedInvList}
                issuers={issuers}
                clients={billingClients}
                brands={brandsList}
                talents={talentsList}
                campaigns={campaignsList}
                isAdmin={role === 'admin'}
                isStaff={isStaff}
              />
            ),
          },
          {
            key:   'clientes',
            label: 'Clientes',
            content: (
              <BillingClientsManager
                clients={billingClients}
                invoices={issuedInvList}
                brands={brandsList}
              />
            ),
          },
          {
            key:   'emisoras',
            label: 'Empresas emisoras',
            content: (
              <IssuersManagerTab
                issuers={issuers}
                isAdmin={role === 'admin'}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
