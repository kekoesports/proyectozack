import { requirePermission } from '@/lib/permissions';
import { getGastosData } from '@/lib/queries/financeDashboard/gastos';
import type { InvoiceWithRelations } from '@/types/invoice';
import { normalizeExpenseStatusForDisplay, type ExpenseStatusDisplay } from '@/lib/utils/expense-status-display';

import { GastosFilters } from '@/features/admin/finance-dashboard/components/gastos/GastosFilters';
import { GastosKpisBlock } from '@/features/admin/finance-dashboard/components/gastos/GastosKpis';
import { GastosLecturaRapida } from '@/features/admin/finance-dashboard/components/gastos/GastosLecturaRapida';
import { GastosBreakdownCharts } from '@/features/admin/finance-dashboard/components/gastos/GastosBreakdownCharts';
import { GastosSinClasificarBloque } from '@/features/admin/finance-dashboard/components/gastos/GastosSinClasificarBloque';
import { GastosTopProveedoresBloque } from '@/features/admin/finance-dashboard/components/gastos/GastosTopProveedores';
import { GastosTabla } from '@/features/admin/finance-dashboard/components/gastos/GastosTabla';
import { GastosAccesosRapidos } from '@/features/admin/finance-dashboard/components/gastos/GastosAccesosRapidos';

export const metadata = { title: 'Gastos · Finanzas' };

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

export default async function FinanzasGastosPage({ searchParams }: PageProps): Promise<React.ReactElement> {
  await requirePermission('facturacion', 'read');

  const sp = (await searchParams) ?? {};
  const from = safeIsoDate(firstParam(sp.from));
  const to = safeIsoDate(firstParam(sp.to));
  const grupo = firstParam(sp.grupo) ?? 'todos';
  const subtipo = firstParam(sp.subtipo) ?? '';
  const estado = firstParam(sp.estado) ?? 'todos';
  const clasificacion = firstParam(sp.clasificacion) ?? 'todos';
  const proveedor = (firstParam(sp.proveedor) ?? '').trim().toLowerCase();

  const data = await getGastosData({
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  });

  const today = todayInMadrid();
  const defaults = { from: `${today.slice(0, 4)}-01-01`, to: today };

  // Filtrado en cliente (poco volumen).
  const filteredRows: readonly InvoiceWithRelations[] = data.rows.filter((row) => {
    // Grupo
    if (grupo === 'campaign_direct' && row.expenseGroup !== 'campaign_direct') return false;
    if (grupo === 'operational' && row.expenseGroup !== 'operational') return false;
    if (grupo === 'sin_clasificar' && row.expenseGroup !== null) return false;
    // Subtipo
    if (subtipo && row.expenseSubtype !== subtipo) return false;
    // Clasificación
    if (clasificacion === 'clasificados' && !row.expenseGroup) return false;
    if (clasificacion === 'sin_clasificar' && row.expenseGroup) return false;
    // Estado normalizado
    if (estado !== 'todos') {
      const status: ExpenseStatusDisplay = normalizeExpenseStatusForDisplay(row.status);
      if (status !== estado) return false;
    }
    // Proveedor (contiene, case-insensitive)
    if (proveedor) {
      const haystack = `${row.counterpartyName ?? ''} ${row.concept ?? ''}`.toLowerCase();
      if (!haystack.includes(proveedor)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5 pt-2">
      <header>
        <h1 className="text-xl font-bold text-sp-admin-fg">Gastos</h1>
        <p className="text-sm text-sp-admin-muted">
          Directos de campaña, operativos y sin clasificar. Categorización asistida.
        </p>
      </header>

      <GastosFilters defaults={defaults} applied={data.period} />

      <GastosKpisBlock kpis={data.kpis} />

      <div className="grid gap-4 lg:grid-cols-2">
        <GastosLecturaRapida data={data} />
        <GastosTopProveedoresBloque rows={data.topProveedores} />
      </div>

      <GastosBreakdownCharts
        byGroup={data.byGroup}
        bySubtype={data.bySubtype}
        monthly={data.monthly}
      />

      <GastosSinClasificarBloque rows={data.sinClasificarRows} />

      <GastosTabla rows={filteredRows} totalRows={data.rows.length} />

      <GastosAccesosRapidos />
    </div>
  );
}
