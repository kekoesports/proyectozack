import { requirePermission } from '@/lib/permissions';
import { getFinanzasResumenV2 } from '@/lib/queries/financeDashboard/finanzasResumenV2';
import { getFinanceDashboard, getCashflowSeries } from '@/lib/queries/financeDashboard';
import { getArAging } from '@/lib/queries/financeDashboard/arAging';
import { getUnclassifiedExpenseCount } from '@/lib/queries/invoices';
import { getBankDataStatus } from '@/lib/queries/financeDashboard/bankDataStatus';

import { ResumenFilters } from '@/features/admin/finance-dashboard/components/resumen-v2/ResumenFilters';
import { ResumenIngresosBlock } from '@/features/admin/finance-dashboard/components/resumen-v2/ResumenIngresosBlock';
import { ResumenCostesMargenBlock } from '@/features/admin/finance-dashboard/components/resumen-v2/ResumenCostesMargenBlock';
import { ResumenNominasBlock } from '@/features/admin/finance-dashboard/components/resumen-v2/ResumenNominasBlock';
import { ResumenImpuestosBlock } from '@/features/admin/finance-dashboard/components/resumen-v2/ResumenImpuestosBlock';
import { ResumenOperativosBlock } from '@/features/admin/finance-dashboard/components/resumen-v2/ResumenOperativosBlock';
import { ResumenResultadoBlock } from '@/features/admin/finance-dashboard/components/resumen-v2/ResumenResultadoBlock';
import { ResumenPendientesBlock } from '@/features/admin/finance-dashboard/components/resumen-v2/ResumenPendientesBlock';

import { KpisPrincipales } from '@/features/admin/finance-dashboard/components/resumen-v3/KpisPrincipales';
import { BankDataWarning } from '@/features/admin/finance-dashboard/components/resumen-v3/BankDataWarning';
import { LecturaRapida } from '@/features/admin/finance-dashboard/components/resumen-v3/LecturaRapida';
import { AlertasBloque } from '@/features/admin/finance-dashboard/components/resumen-v3/AlertasBloque';
import { IncomeExpenseChart } from '@/features/admin/finance-dashboard/components/resumen-v3/IncomeExpenseChart';
import { InvoicedVsCollectedChart } from '@/features/admin/finance-dashboard/components/resumen-v3/InvoicedVsCollectedChart';
import { ExpensesByCategoryChart } from '@/features/admin/finance-dashboard/components/resumen-v3/ExpensesByCategoryChart';
import { AgingChart } from '@/features/admin/finance-dashboard/components/resumen-v3/AgingChart';

export const metadata = { title: 'Resumen · Finanzas' };

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayInMadrid(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function firstParam(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function safeIsoDate(v: string | undefined): string | undefined {
  if (!v || !ISO_DATE_RE.test(v)) return undefined;
  return v;
}

type PageProps = {
  readonly searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FinanzasResumenPage({ searchParams }: PageProps): Promise<React.ReactElement> {
  await requirePermission('facturacion', 'read');

  const sp = (await searchParams) ?? {};
  const from = safeIsoDate(firstParam(sp.from));
  const to = safeIsoDate(firstParam(sp.to));

  const [resumen, dashboard, cashflow, arAging, unclassifiedCount, bankStatus] = await Promise.all([
    getFinanzasResumenV2({
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    getFinanceDashboard(),
    getCashflowSeries(12),
    getArAging({}),
    getUnclassifiedExpenseCount(),
    getBankDataStatus(),
  ]);

  const today = todayInMadrid();
  const defaults = {
    from: `${today.slice(0, 4)}-01-01`,
    to: today,
  };

  return (
    <div className="space-y-5 pt-2">
      {/* 1. Cabecera + filtros */}
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-sp-admin-fg">Resumen económico</h1>
          <p className="text-sm text-sp-admin-muted">
            De lo facturado, cuánto se queda SocialPro después de talents, nóminas, impuestos y gastos operativos.
          </p>
        </div>
      </header>

      <ResumenFilters applied={resumen.period} defaults={defaults} />

      {/* 2. KPIs principales */}
      <KpisPrincipales resumen={resumen} />

      {/* 3. Aviso si falta bank data */}
      <BankDataWarning
        bankTransactionsCount={bankStatus.bankTransactionsCount}
        invoicePaymentsCount={bankStatus.invoicePaymentsCount}
      />

      {/* 4. Lectura rápida + Alertas — dos columnas en desktop */}
      <div className="grid gap-4 lg:grid-cols-2">
        <LecturaRapida resumen={resumen} unclassifiedExpensesCount={unclassifiedCount} />
        <AlertasBloque alerts={dashboard.alerts} />
      </div>

      {/* 5. Gráficos — dos filas de 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <IncomeExpenseChart data={cashflow} />
        <InvoicedVsCollectedChart resumen={resumen} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ExpensesByCategoryChart resumen={resumen} />
        <AgingChart buckets={arAging.buckets} />
      </div>

      {/* 6. Bloques de detalle v2 (reutilizados sin cambios) */}
      <ResumenIngresosBlock ingresos={resumen.ingresos} />
      <ResumenCostesMargenBlock
        costesDirectos={resumen.costesDirectos}
        margenBruto={resumen.margenBruto}
      />
      <ResumenNominasBlock nominas={resumen.nominas} />
      <ResumenImpuestosBlock impuestos={resumen.impuestos} />
      <ResumenOperativosBlock operativos={resumen.operativos} />
      <ResumenResultadoBlock
        margenBruto={resumen.margenBruto}
        nominas={resumen.nominas}
        impuestos={resumen.impuestos}
        operativos={resumen.operativos}
        resultado={resumen.resultado}
      />
      <ResumenPendientesBlock pendientes={resumen.pendientes} />
    </div>
  );
}
