import Link from 'next/link';
import type {
  RentabilidadRankings,
  RankingMarcaRow,
  RankingTalentoRow,
  RankingCampanaDesviacionRow,
} from '@/lib/queries/financeDashboard/rentabilidad';

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
function fmtMoney(n: number): string { return EUR.format(n); }
function fmtPct(n: number | null): string { return n === null ? '—' : `${n.toFixed(1)}%`; }

/**
 * Bar horizontal simple sin librería — evita cargar Recharts en cards de ranking
 * y da un feedback visual claro de "cuánto peso tiene cada fila sobre el max".
 */
function ProgressBar({ pct, colorClass }: { readonly pct: number; readonly colorClass: string }): React.ReactElement {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="w-full h-1.5 rounded-full bg-sp-border/40 overflow-hidden">
      <div
        className={`h-full rounded-full ${colorClass}`}
        style={{ width: `${clamped}%` }}
        aria-hidden
      />
    </div>
  );
}

function RankCard({
  title,
  subtitle,
  children,
  emptyLabel,
  isEmpty,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly children: React.ReactNode;
  readonly emptyLabel: string;
  readonly isEmpty: boolean;
}): React.ReactElement {
  return (
    <section className="rounded-2xl border border-sp-border bg-sp-admin-card overflow-hidden">
      <div className="px-4 py-3 border-b border-sp-border">
        <h3 className="text-sm font-bold text-sp-admin-fg">{title}</h3>
        <p className="text-[11px] text-sp-admin-muted mt-0.5">{subtitle}</p>
      </div>
      {isEmpty ? (
        <div className="px-4 py-8 text-center">
          <p className="text-[12px] text-sp-admin-muted italic">{emptyLabel}</p>
        </div>
      ) : (
        <ul className="divide-y divide-sp-border/40">{children}</ul>
      )}
    </section>
  );
}

// ── Marcas por margen ────────────────────────────────────────────────────

function MarcaMargenItem({
  rank,
  row,
  maxValue,
}: {
  readonly rank: number;
  readonly row: RankingMarcaRow;
  readonly maxValue: number;
}): React.ReactElement {
  const pct = maxValue > 0 ? (row.margenReal / maxValue) * 100 : 0;
  return (
    <li className="px-4 py-2.5 hover:bg-sp-admin-hover transition-colors">
      <div className="flex items-baseline gap-2 mb-1.5">
        <span className="text-[10px] font-bold text-sp-admin-muted w-4 tabular-nums shrink-0">#{rank}</span>
        <span className="text-[13px] font-semibold text-sp-admin-fg truncate flex-1">{row.brandName}</span>
        <span className="text-[12px] font-bold text-emerald-500 tabular-nums whitespace-nowrap">
          {fmtMoney(row.margenReal)}
        </span>
      </div>
      <ProgressBar pct={pct} colorClass="bg-emerald-500/60" />
      <div className="flex items-center justify-between mt-1 text-[10px] text-sp-admin-muted">
        <span>{fmtPct(row.margenRealPct)} margen</span>
        <span>{row.campanas} camp.</span>
      </div>
    </li>
  );
}

// ── Marcas por facturación ──────────────────────────────────────────────

function MarcaFacturacionItem({
  rank,
  row,
  maxValue,
}: {
  readonly rank: number;
  readonly row: RankingMarcaRow;
  readonly maxValue: number;
}): React.ReactElement {
  const pct = maxValue > 0 ? (row.ingresosReales / maxValue) * 100 : 0;
  return (
    <li className="px-4 py-2.5 hover:bg-sp-admin-hover transition-colors">
      <div className="flex items-baseline gap-2 mb-1.5">
        <span className="text-[10px] font-bold text-sp-admin-muted w-4 tabular-nums shrink-0">#{rank}</span>
        <span className="text-[13px] font-semibold text-sp-admin-fg truncate flex-1">{row.brandName}</span>
        <span className="text-[12px] font-bold text-sp-admin-fg tabular-nums whitespace-nowrap">
          {fmtMoney(row.ingresosReales)}
        </span>
      </div>
      <ProgressBar pct={pct} colorClass="bg-sp-orange/70" />
      <div className="flex items-center justify-between mt-1 text-[10px] text-sp-admin-muted">
        <span>Margen: {fmtPct(row.margenRealPct)}</span>
        <span>{row.campanas} camp.</span>
      </div>
    </li>
  );
}

// ── Talentos por coste ──────────────────────────────────────────────────

function TalentoCosteItem({
  rank,
  row,
}: {
  readonly rank: number;
  readonly row: RankingTalentoRow;
}): React.ReactElement {
  return (
    <li className="px-4 py-2.5 hover:bg-sp-admin-hover transition-colors">
      <div className="flex items-baseline gap-2 mb-1.5">
        <span className="text-[10px] font-bold text-sp-admin-muted w-4 tabular-nums shrink-0">#{rank}</span>
        <span className="text-[13px] font-semibold text-sp-admin-fg truncate flex-1">{row.talentName}</span>
        <span className="text-[12px] font-bold text-amber-500 tabular-nums whitespace-nowrap">
          {fmtMoney(row.costeReal)}
        </span>
      </div>
      <ProgressBar pct={row.concentracionPctSobreTotal} colorClass="bg-amber-500/70" />
      <div className="flex items-center justify-between mt-1 text-[10px] text-sp-admin-muted">
        <span>{row.concentracionPctSobreTotal.toFixed(1)}% del coste total de talentos</span>
        <span>{row.campanas} camp.</span>
      </div>
    </li>
  );
}

// ── Campañas peor desviación ────────────────────────────────────────────

function DesviacionItem({
  rank,
  row,
}: {
  readonly rank: number;
  readonly row: RankingCampanaDesviacionRow;
}): React.ReactElement {
  return (
    <li className="px-4 py-2.5 hover:bg-sp-admin-hover transition-colors">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-[10px] font-bold text-sp-admin-muted w-4 tabular-nums shrink-0">#{rank}</span>
        <Link
          href={`/admin/campanas/${row.id}`}
          className="text-[13px] font-semibold text-sp-admin-fg hover:text-sp-admin-accent truncate flex-1"
        >
          {row.name}
        </Link>
        <span className="text-[12px] font-bold text-red-500 tabular-nums whitespace-nowrap">
          {row.desviacionPct.toFixed(1)} pp
        </span>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-sp-admin-muted mt-1">
        <span>Pactado {row.margenPactadoPct.toFixed(1)}% → Real {row.margenRealPct.toFixed(1)}%</span>
        <span className="ml-auto">{row.brandName ?? '—'} · {row.talentName ?? '—'}</span>
      </div>
    </li>
  );
}

// ── Componente principal ─────────────────────────────────────────────────

export function RentabilidadRankingsBlock({ rankings }: { readonly rankings: RentabilidadRankings }): React.ReactElement {
  const maxMargen = Math.max(0, ...rankings.topMarcasPorMargen.map((m) => m.margenReal));
  const maxFacturacion = Math.max(0, ...rankings.topMarcasPorFacturacion.map((m) => m.ingresosReales));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <RankCard
        title="Top marcas por margen real"
        subtitle="Ingresos reales − costes reales, orden descendente."
        isEmpty={rankings.topMarcasPorMargen.length === 0}
        emptyLabel="Aún no hay marcas con margen real facturado en el período."
      >
        {rankings.topMarcasPorMargen.map((r, i) => (
          <MarcaMargenItem key={r.brandId} rank={i + 1} row={r} maxValue={maxMargen} />
        ))}
      </RankCard>

      <RankCard
        title="Top marcas por facturación asociada"
        subtitle="Ingresos reales agregados por marca."
        isEmpty={rankings.topMarcasPorFacturacion.length === 0}
        emptyLabel="Aún no hay facturación asociada a marcas en el período."
      >
        {rankings.topMarcasPorFacturacion.map((r, i) => (
          <MarcaFacturacionItem key={r.brandId} rank={i + 1} row={r} maxValue={maxFacturacion} />
        ))}
      </RankCard>

      <RankCard
        title="Top talentos por coste real"
        subtitle="Pagos a talento agregados por persona (concentración sobre el total)."
        isEmpty={rankings.topTalentosPorCoste.length === 0}
        emptyLabel="Aún no hay pagos a talentos registrados en el período."
      >
        {rankings.topTalentosPorCoste.map((r, i) => (
          <TalentoCosteItem key={r.talentId} rank={i + 1} row={r} />
        ))}
      </RankCard>

      <RankCard
        title="Peores desviaciones pactado vs real"
        subtitle="Campañas con margen real por debajo del pactado. Click para abrir."
        isEmpty={rankings.peoresDesviaciones.length === 0}
        emptyLabel="Ninguna campaña con desviación negativa registrada."
      >
        {rankings.peoresDesviaciones.map((r, i) => (
          <DesviacionItem key={r.id} rank={i + 1} row={r} />
        ))}
      </RankCard>

      {/* Aparcado honesto — no hay FK fiable de campaña → billing_client */}
      {rankings.clientesInsuficientes && (
        <section className="lg:col-span-2 rounded-2xl border border-dashed border-sp-border bg-sp-admin-card/50 p-4">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden>👤</span>
            <h3 className="text-sm font-bold text-sp-admin-fg">Ranking de clientes</h3>
            <span className="ml-auto text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/30">
              Datos insuficientes
            </span>
          </div>
          <p className="text-[12px] text-sp-admin-muted leading-relaxed mt-2">
            En el modelo actual del CRM la unidad comercial vinculada a campañas es la marca
            (<code className="text-sp-admin-fg">crm_brands</code>). El concepto de cliente de facturación
            (<code className="text-sp-admin-fg">billing_clients</code>) se usa sólo en facturas emitidas SP → cliente,
            y no tiene un FK fiable con campañas o gastos internos. No mostramos el ranking para
            evitar datos engañosos.
          </p>
        </section>
      )}
    </div>
  );
}
