import { asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { crmBrands, talents } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getNominasCreadoresData, NOMINAS_SUBTYPES, TALENT_SUBTYPES } from '@/lib/queries/financeDashboard/nominasCreadores';
import { normalizeExpenseStatusForDisplay, type ExpenseStatusDisplay } from '@/lib/utils/expense-status-display';
import type { InvoiceWithRelations } from '@/types/invoice';

import { NominasFilters } from '@/features/admin/finance-dashboard/components/nominas-creadores/NominasFilters';
import { NominasKpisBlock } from '@/features/admin/finance-dashboard/components/nominas-creadores/NominasKpis';
import { NominasLecturaRapida } from '@/features/admin/finance-dashboard/components/nominas-creadores/NominasLecturaRapida';
import { NominasBreakdownCharts } from '@/features/admin/finance-dashboard/components/nominas-creadores/NominasBreakdownCharts';
import { NominasTopRankings } from '@/features/admin/finance-dashboard/components/nominas-creadores/NominasTopRankings';
import { NominasTabsSwitcher } from '@/features/admin/finance-dashboard/components/nominas-creadores/NominasTabsSwitcher';
import { NominasAccesosRapidos } from '@/features/admin/finance-dashboard/components/nominas-creadores/NominasAccesosRapidos';

export const metadata = { title: 'Nóminas y creadores · Finanzas' };

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIPO_VALID = ['todos', 'nominas', 'talentos', 'seguridad_social'] as const;
type Tipo = (typeof TIPO_VALID)[number];

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

function normalizeTipo(v: string | undefined): Tipo {
  if (!v) return 'todos';
  return (TIPO_VALID as readonly string[]).includes(v) ? (v as Tipo) : 'todos';
}

type PageProps = {
  readonly searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FinanzasNominasCreadoresPage({ searchParams }: PageProps): Promise<React.ReactElement> {
  await requirePermission('facturacion', 'read');

  const sp = (await searchParams) ?? {};
  const from = safeIsoDate(firstParam(sp.from));
  const to = safeIsoDate(firstParam(sp.to));
  const tipo = normalizeTipo(firstParam(sp.tipo));
  const estado = firstParam(sp.estado) ?? 'todos';
  const persona = firstParam(sp.persona) ?? '';
  const talento = firstParam(sp.talento) ?? '';
  const marca = firstParam(sp.marca) ?? '';

  const [data, brandsList, talentsList] = await Promise.all([
    getNominasCreadoresData({
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    db.select({ id: crmBrands.id, name: crmBrands.name }).from(crmBrands).orderBy(asc(crmBrands.name)),
    db.select({ id: talents.id, name: talents.name }).from(talents).orderBy(asc(talents.name)),
  ]);

  const today = todayInMadrid();
  const defaults = { from: `${today.slice(0, 4)}-01-01`, to: today };

  // Personas únicas de las nóminas para el dropdown de filtro.
  const personasSet = new Set<string>();
  for (const r of data.nominasRows) if (r.counterpartyName) personasSet.add(r.counterpartyName);
  const personasList = [...personasSet].sort();

  // Filtros client-side sobre las filas del período.
  function matchesCommon(row: InvoiceWithRelations): boolean {
    if (estado !== 'todos') {
      const st: ExpenseStatusDisplay = normalizeExpenseStatusForDisplay(row.status);
      if (st !== estado) return false;
    }
    if (marca && (row.brandName ?? '').toLowerCase() !== marca.toLowerCase()) return false;
    return true;
  }

  const filteredNominas = data.nominasRows.filter((row) => {
    if (!matchesCommon(row)) return false;
    if (persona && (row.counterpartyName ?? '') !== persona) return false;
    if (tipo === 'nominas' && row.expenseSubtype !== 'nomina_socio') return false;
    if (tipo === 'seguridad_social' && !['seguridad_social', 'cuota_autonomo', 'factura_autonomo'].includes(row.expenseSubtype ?? '')) return false;
    if (tipo === 'talentos') return false; // tab talentos oculta nóminas
    return true;
  });

  const filteredTalentos = data.talentosRows.filter((row) => {
    if (!matchesCommon(row)) return false;
    if (talento && (row.talentName ?? '') !== talento) return false;
    if (tipo === 'nominas' || tipo === 'seguridad_social') return false; // tab nóminas oculta talentos
    return true;
  });

  const totalsForCharts = {
    nominas: data.kpis.totalNominas,
    seguridadSocial: data.kpis.totalSeguridadSocial,
    talentos: data.kpis.totalTalentos,
  };

  return (
    <div className="space-y-5 pt-2">
      <header>
        <h1 className="text-xl font-bold text-sp-admin-fg">Nóminas y creadores</h1>
        <p className="text-sm text-sp-admin-muted">
          Coste interno (nóminas + SS/autónomos) y coste externo (pagos a talentos).
        </p>
      </header>

      <NominasFilters
        defaults={defaults}
        applied={data.period}
        personas={personasList}
        talentos={talentsList}
        brands={brandsList}
      />

      <NominasKpisBlock kpis={data.kpis} />

      <NominasLecturaRapida data={data} />

      <NominasBreakdownCharts totals={totalsForCharts} monthly={data.breakdownMonthly} />

      <NominasTopRankings
        personas={data.topPersonas}
        talentos={data.topTalentos}
        campanas={data.campanasConPagos}
      />

      <NominasTabsSwitcher
        nominasRows={filteredNominas}
        nominasTotal={data.nominasRows.length}
        talentosRows={filteredTalentos}
        talentosTotal={data.talentosRows.length}
        initialTab={tipo === 'talentos' ? 'talentos' : 'nominas'}
      />

      <NominasAccesosRapidos />

      {/* Silencia warnings de import de constantes que se usan solo en tipos */}
      <span hidden aria-hidden data-subtypes={[...NOMINAS_SUBTYPES, ...TALENT_SUBTYPES].join(',')} />
    </div>
  );
}
