import { requirePermission } from '@/lib/permissions';
import { asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { crmBrands } from '@/db/schema';
import { getIngresosData } from '@/lib/queries/financeDashboard/ingresos';
import { getBankDataStatus } from '@/lib/queries/financeDashboard/bankDataStatus';
import { getBillingClients } from '@/lib/queries/issuedInvoices';

import { IngresosKpisBlock } from '@/features/admin/finance-dashboard/components/ingresos/IngresosKpis';
import { IngresosFilters } from '@/features/admin/finance-dashboard/components/ingresos/IngresosFilters';
import { IngresosTabla } from '@/features/admin/finance-dashboard/components/ingresos/IngresosTabla';
import { TopClientesBloque } from '@/features/admin/finance-dashboard/components/ingresos/TopClientesBloque';
import { TopMarcasBloque } from '@/features/admin/finance-dashboard/components/ingresos/TopMarcasBloque';
import { IngresosAccesosRapidos } from '@/features/admin/finance-dashboard/components/ingresos/IngresosAccesosRapidos';
import { BankDataWarning } from '@/features/admin/finance-dashboard/components/resumen-v3/BankDataWarning';
import { ArAgingBuckets } from '@/features/admin/finance-dashboard/components/ArAgingBuckets';
import {
  normalizeInvoiceStatusForDisplay,
  type InvoiceStatusDisplay,
} from '@/lib/utils/invoice-status-display';
import type { ArAgingRow } from '@/types/arAging';

export const metadata = { title: 'Ingresos · Finanzas' };

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STATUS_VALUES: readonly (InvoiceStatusDisplay | 'todas')[] = ['todas', 'emitida', 'parcial', 'cobrada', 'vencida', 'cancelada', 'pendiente'];
const TIPO_VALUES: readonly ('todas' | 'internal' | 'issued')[] = ['todas', 'internal', 'issued'];

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

function normalizeStatusFilter(v: string | undefined): InvoiceStatusDisplay | 'todas' {
  if (!v) return 'todas';
  return (STATUS_VALUES as readonly string[]).includes(v)
    ? (v as InvoiceStatusDisplay | 'todas')
    : 'todas';
}

function normalizeTipoFilter(v: string | undefined): 'todas' | 'internal' | 'issued' {
  if (!v) return 'todas';
  return (TIPO_VALUES as readonly string[]).includes(v)
    ? (v as 'todas' | 'internal' | 'issued')
    : 'todas';
}

type PageProps = {
  readonly searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FinanzasIngresosPage({ searchParams }: PageProps): Promise<React.ReactElement> {
  await requirePermission('facturacion', 'read');

  const sp = (await searchParams) ?? {};
  const from = safeIsoDate(firstParam(sp.from));
  const to = safeIsoDate(firstParam(sp.to));
  const cliente = firstParam(sp.cliente) ?? null;
  const marca = firstParam(sp.marca) ?? null;
  const estado = normalizeStatusFilter(firstParam(sp.estado));
  const tipo = normalizeTipoFilter(firstParam(sp.tipo));

  const [data, bankStatus, clients, brands] = await Promise.all([
    getIngresosData({
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    getBankDataStatus(),
    getBillingClients(),
    db.select({ id: crmBrands.id, name: crmBrands.name }).from(crmBrands).orderBy(asc(crmBrands.name)),
  ]);

  const today = todayInMadrid();
  const defaults = { from: `${today.slice(0, 4)}-01-01`, to: today };
  const clientOptions = clients.map((c) => ({ id: c.id, name: c.name }));

  const filtersApplied = { cliente, marca, estado, tipo };
  const filteredRows = data.aging.rows.filter((row: ArAgingRow) => {
    const status = normalizeInvoiceStatusForDisplay(row.status);
    if (tipo !== 'todas' && row.source !== tipo) return false;
    if (estado !== 'todas' && status !== estado) return false;
    if (cliente) {
      const clientName = row.clientName ?? row.entity ?? '';
      if (clientName.toLowerCase() !== cliente.toLowerCase()) return false;
    }
    if (marca) {
      const brandName = row.brandName ?? '';
      if (brandName.toLowerCase() !== marca.toLowerCase()) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5 pt-2">
      <header>
        <h1 className="text-xl font-bold text-sp-admin-fg">Ingresos</h1>
        <p className="text-sm text-sp-admin-muted">
          Facturación, cobros pendientes, aging y ranking de clientes.
        </p>
      </header>

      <IngresosFilters
        defaults={defaults}
        applied={data.period}
        clients={clientOptions}
        brands={brands}
      />

      <IngresosKpisBlock kpis={data.kpis} />

      <BankDataWarning
        bankTransactionsCount={bankStatus.bankTransactionsCount}
        invoicePaymentsCount={bankStatus.invoicePaymentsCount}
      />

      <section aria-labelledby="aging-title" className="rounded-2xl border border-sp-border bg-sp-admin-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg" aria-hidden>📅</span>
          <h2 id="aging-title" className="text-sm font-bold text-sp-admin-fg">Aging de cobros</h2>
          <span className="ml-auto text-[11px] text-sp-admin-muted">Distribución por antigüedad del pendiente</span>
        </div>
        <ArAgingBuckets buckets={data.aging.buckets} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <TopClientesBloque rows={data.topClientes} />
        <div className="grid gap-4">
          <TopMarcasBloque rows={data.topMarcasFacturado} variant="facturado" />
          <TopMarcasBloque rows={data.topMarcasPendiente} variant="pendiente" />
        </div>
      </div>

      <IngresosTabla
        rows={filteredRows}
        filteredRowCount={filteredRows.length}
        totalRows={data.aging.rows.length}
        filters={filtersApplied}
      />

      <IngresosAccesosRapidos />
    </div>
  );
}
