import { asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { crmBrands, talents } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getFinancePnL } from '@/lib/queries/financeDashboard/pnlDetail';
import { startOfLocalYearIso, todayLocalIso } from '@/lib/utils/date';
import { PnLOverviewCards } from '@/features/admin/pnl/components/PnLOverviewCards';
import { PnLBreakdownTable } from '@/features/admin/pnl/components/PnLBreakdownTable';
import { PnLCategoryList } from '@/features/admin/pnl/components/PnLCategoryList';
import { PnLFilters } from '@/features/admin/pnl/components/PnLFilters';
import { AnnualExpenseBreakdown } from '@/features/admin/pnl/components/AnnualExpenseBreakdown';
import type { InvoiceCompany } from '@/types';
import type { PnLFilters as PnLFiltersType } from '@/lib/queries/pnl';

export const metadata = { title: 'Resultados | Finanzas Admin' };

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

const VALID_COMPANIES: readonly string[] = [
  'spain', 'andorra', 'argentina', 'spain_andorra', 'spain_argentina',
];

function parseSearchParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

type PageProps = {
  readonly searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FinanzasPnLPage({ searchParams }: PageProps): Promise<React.ReactElement> {
  await requirePermission('facturacion', 'read');

  const sp = (await searchParams) ?? {};
  const company = parseSearchParam(sp.company);
  const from = parseSearchParam(sp.from) || startOfLocalYearIso();
  const to = parseSearchParam(sp.to) || todayLocalIso();
  const brandIdRaw = parseSearchParam(sp.brandId);
  const talentIdRaw = parseSearchParam(sp.talentId);

  const filters: PnLFiltersType = {
    from,
    to,
    ...(VALID_COMPANIES.includes(company) ? { company: company as InvoiceCompany } : {}),
    ...(brandIdRaw && /^\d+$/.test(brandIdRaw) ? { brandId: Number(brandIdRaw) } : {}),
    ...(talentIdRaw && /^\d+$/.test(talentIdRaw) ? { talentId: Number(talentIdRaw) } : {}),
  };

  const [pnl, brandList, talentList] = await Promise.all([
    getFinancePnL(filters),
    db.select({ id: crmBrands.id, name: crmBrands.name }).from(crmBrands).orderBy(asc(crmBrands.name)),
    db.select({ id: talents.id, name: talents.name }).from(talents).orderBy(asc(talents.name)),
  ]);

  return (
    <div className="space-y-6 pt-2">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-black uppercase text-sp-admin-text">Resultados</h1>
          <p className="text-sm text-sp-admin-muted">Resultado del periodo. Importes por fecha de factura/gasto. Caja muestra cobros y pagos conciliados.</p>
        </div>
      </div>

      <PnLFilters
        company={company}
        from={from}
        to={to}
        brandId={brandIdRaw}
        talentId={talentIdRaw}
        brands={brandList}
        talents={talentList}
      />

      <PnLOverviewCards pnl={pnl} />

      {/* Desglose por expenseGroup */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted">Costes directos</p>
          <p className="mt-2 text-xl font-bold text-red-400">{EUR.format(pnl.gastosCampanaDirect)}</p>
          <p className="text-[10px] text-sp-admin-muted mt-0.5">Gastos directos de campaña</p>
        </div>
        <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted">Gastos operativos</p>
          <p className="mt-2 text-xl font-bold text-amber-400">{EUR.format(pnl.gastosOperativos)}</p>
          <p className="text-[10px] text-sp-admin-muted mt-0.5">Software, gestoría, impuestos, nóminas y marketing</p>
        </div>
        {pnl.gastosNoClasificados > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400">Sin clasificar</p>
            <p className="mt-2 text-xl font-bold text-amber-400">{EUR.format(pnl.gastosNoClasificados)}</p>
            <p className="text-[10px] text-amber-400/70 mt-0.5">Pendiente de asignar grupo</p>
          </div>
        )}
      </div>

      {/* Dónde se ha ido el dinero — desglose visual por subgrupo */}
      <AnnualExpenseBreakdown
        rows={pnl.expenseBySubgroup}
        totalExpense={pnl.gastos}
        from={from}
        to={to}
      />

      {/* Caja YTD */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted">Cobrado YTD (caja)</p>
          <p className="mt-2 text-xl font-bold text-emerald-400">{EUR.format(pnl.cobradoYTD)}</p>
          <p className="text-[10px] text-sp-admin-muted mt-0.5">Cobros conciliados del año</p>
        </div>
        <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-sp-admin-muted">Pagado YTD (caja)</p>
          <p className="mt-2 text-xl font-bold text-red-400">{EUR.format(pnl.pagadoYTD)}</p>
          <p className="text-[10px] text-sp-admin-muted mt-0.5">Pagos conciliados del año</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PnLBreakdownTable breakdown={pnl.breakdownByMonth} />
        </div>
        <PnLCategoryList breakdown={pnl.breakdownByCategory} />
      </div>
    </div>
  );
}
