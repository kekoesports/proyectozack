import { requirePermission } from '@/lib/permissions';
import { getArAging } from '@/lib/queries/financeDashboard/arAging';
import { AR_AGING_BUCKET_ORDER, type ArAgingBucketKey, type ArAgingFilters, type ArAgingSource } from '@/types/arAging';
import { ArAgingKPIs } from '@/features/admin/finance-dashboard/components/ArAgingKPIs';
import { ArAgingBuckets } from '@/features/admin/finance-dashboard/components/ArAgingBuckets';
import { ArAgingTable } from '@/features/admin/finance-dashboard/components/ArAgingTable';
import { ArAgingFiltersBar } from '@/features/admin/finance-dashboard/components/ArAgingFilters';

export const metadata = { title: 'Cobros pendientes · Finanzas' };

const BUCKET_SET = new Set<ArAgingBucketKey>(AR_AGING_BUCKET_ORDER);
const SOURCE_SET = new Set<ArAgingSource>(['issued', 'internal']);

type PageProps = {
  readonly searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FinanzasCobrosPage({ searchParams }: PageProps): Promise<React.ReactElement> {
  await requirePermission('facturacion', 'read');

  const sp = (await searchParams) ?? {};
  const filters = parseFilters(sp);
  const data = await getArAging(filters);

  return (
    <div className="space-y-5 pt-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-sp-admin-fg">Cobros pendientes</h1>
          <p className="text-sm text-sp-admin-muted">
            Facturas emitidas e internas con saldo pendiente. Ordenadas por vencimiento.
          </p>
        </div>
      </div>

      {data.hasMultipleCurrencies && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-300">
          Los totales agregan importes en distintas divisas sin conversión. Revisa las filas para el detalle.
        </div>
      )}

      <ArAgingKPIs kpis={data.kpis} />

      <ArAgingBuckets buckets={data.buckets} />

      <ArAgingFiltersBar
        applied={data.appliedFilters}
        availableEntities={data.availableEntities}
        availableBrands={data.availableBrands}
        hasResults={data.rows.length > 0}
      />

      <ArAgingTable rows={data.rows} />
    </div>
  );
}

function firstParam(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function parseFilters(sp: Record<string, string | string[] | undefined>): ArAgingFilters {
  const bucket = firstParam(sp.bucket);
  const entity = firstParam(sp.entity);
  const brand = firstParam(sp.brand);
  const source = firstParam(sp.source);

  const out: {
    bucket?: ArAgingBucketKey;
    entity?: string;
    brand?: string;
    source?: ArAgingSource;
  } = {};

  if (bucket && BUCKET_SET.has(bucket as ArAgingBucketKey)) {
    out.bucket = bucket as ArAgingBucketKey;
  }
  if (entity) out.entity = entity;
  if (brand) out.brand = brand;
  if (source && SOURCE_SET.has(source as ArAgingSource)) {
    out.source = source as ArAgingSource;
  }
  return out;
}
