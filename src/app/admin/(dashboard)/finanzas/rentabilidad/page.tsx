import { asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { crmBrands, talents } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getRentabilidadData, type RentabilidadFiltroMargen } from '@/lib/queries/financeDashboard/rentabilidad';

import { RentabilidadFilters } from '@/features/admin/finance-dashboard/components/rentabilidad/RentabilidadFilters';
import { RentabilidadKpisBlock } from '@/features/admin/finance-dashboard/components/rentabilidad/RentabilidadKpis';
import { RentabilidadLecturaRapida } from '@/features/admin/finance-dashboard/components/rentabilidad/RentabilidadLecturaRapida';
import { RentabilidadRankingsBlock } from '@/features/admin/finance-dashboard/components/rentabilidad/RentabilidadRankings';
import { RentabilidadChartsBlock } from '@/features/admin/finance-dashboard/components/rentabilidad/RentabilidadCharts';
import { RentabilidadTabla } from '@/features/admin/finance-dashboard/components/rentabilidad/RentabilidadTabla';
import { RentabilidadServicioAparcado } from '@/features/admin/finance-dashboard/components/rentabilidad/RentabilidadServicioAparcado';
import { RentabilidadAccesosRapidos } from '@/features/admin/finance-dashboard/components/rentabilidad/RentabilidadAccesosRapidos';

export const metadata = { title: 'Rentabilidad · Finanzas' };

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MARGEN_VALID: readonly RentabilidadFiltroMargen[] = ['todos', 'rentable', 'bajo', 'negativo', 'sin_datos'];
const CAMPAIGN_STATUS_VALID = new Set([
  'propuesta', 'negociacion', 'aprobada', 'activa',
  'completada', 'pendiente_pago', 'pagada',
]);

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

function safePosInt(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

function safeMargenFilter(v: string | undefined): RentabilidadFiltroMargen {
  if (!v) return 'todos';
  return (MARGEN_VALID as readonly string[]).includes(v)
    ? (v as RentabilidadFiltroMargen)
    : 'todos';
}

type PageProps = {
  readonly searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FinanzasRentabilidadPage({ searchParams }: PageProps): Promise<React.ReactElement> {
  await requirePermission('facturacion', 'read');

  const sp = (await searchParams) ?? {};
  const from     = safeIsoDate(firstParam(sp.from));
  const to       = safeIsoDate(firstParam(sp.to));
  const brandId  = safePosInt(firstParam(sp.marca));
  const talentId = safePosInt(firstParam(sp.talento));
  const estadoRaw = firstParam(sp.estado);
  const campaignStatus = estadoRaw && CAMPAIGN_STATUS_VALID.has(estadoRaw) ? estadoRaw : undefined;
  const margenFilter = safeMargenFilter(firstParam(sp.margen));

  const [data, brandsList, talentsList] = await Promise.all([
    getRentabilidadData({
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      ...(brandId ? { brandId } : {}),
      ...(talentId ? { talentId } : {}),
      ...(campaignStatus ? { campaignStatus } : {}),
      margenFilter,
    }),
    db.select({ id: crmBrands.id, name: crmBrands.name }).from(crmBrands).orderBy(asc(crmBrands.name)),
    db.select({ id: talents.id, name: talents.name }).from(talents).orderBy(asc(talents.name)),
  ]);

  const today = todayInMadrid();
  const defaults = { from: `${today.slice(0, 4)}-01-01`, to: today };

  return (
    <div className="space-y-5 pt-2">
      <header>
        <h1 className="text-xl font-bold text-sp-admin-fg">Rentabilidad</h1>
        <p className="text-sm text-sp-admin-muted">
          Margen pactado vs margen real facturado por campaña. Read-only.
        </p>
      </header>

      <RentabilidadFilters
        defaults={defaults}
        applied={data.period}
        brands={brandsList}
        talentos={talentsList}
      />

      <RentabilidadKpisBlock kpis={data.kpis} />

      <RentabilidadLecturaRapida data={data} />

      <RentabilidadRankingsBlock rankings={data.rankings} />

      <RentabilidadChartsBlock charts={data.charts} />

      <RentabilidadTabla rows={data.filteredRows} totalRows={data.totalCount} />

      <RentabilidadServicioAparcado />

      <RentabilidadAccesosRapidos />
    </div>
  );
}
