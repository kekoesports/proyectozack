import type { TopPersonaRow, TopTalentoRow, CampanaConPagoRow } from '@/lib/queries/financeDashboard/nominasCreadores';

interface Props {
  readonly personas: readonly TopPersonaRow[];
  readonly talentos: readonly TopTalentoRow[];
  readonly campanas: readonly CampanaConPagoRow[];
}

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
function fmt(n: number): string { return EUR.format(n); }

/**
 * Tres rankings side-by-side: personas (nóminas + autónomos),
 * talentos (por coste) y campañas (con pagos pendientes/totales).
 */
export function NominasTopRankings({ personas, talentos, campanas }: Props): React.ReactElement {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Ranking
        icon="👤"
        title="Top personas (nóminas + autónomos)"
        emptyText="Sin nóminas ni autónomos registrados."
      >
        {personas.map((p, idx) => (
          <RankingRow key={p.name} idx={idx} name={p.name} amount={fmt(p.amount)}
            subtext={`${p.count} pago${p.count === 1 ? '' : 's'}`} />
        ))}
      </Ranking>

      <Ranking
        icon="🎬"
        title="Top talentos por coste"
        emptyText="Sin pagos a talentos registrados."
      >
        {talentos.map((t, idx) => (
          <RankingRow key={t.name} idx={idx} name={t.name} amount={fmt(t.amount)}
            subtext={t.pending > 0 ? `${t.count} pago${t.count === 1 ? '' : 's'} · pendiente ${fmt(t.pending)}` : `${t.count} pago${t.count === 1 ? '' : 's'}`}
            {...(t.pending > 0 ? { highlight: 'amber' as const } : {})}
          />
        ))}
      </Ranking>

      <Ranking
        icon="🎯"
        title="Campañas por coste de talento"
        emptyText="Sin campañas con pagos registrados."
      >
        {campanas.slice(0, 5).map((c, idx) => (
          <RankingRow
            key={c.campaignId}
            idx={idx}
            name={c.campaignName}
            amount={fmt(c.totalTalentos)}
            subtext={c.brandName
              ? `${c.brandName} · ${c.talentosCount} talento${c.talentosCount === 1 ? '' : 's'}${c.pendiente > 0 ? ` · pendiente ${fmt(c.pendiente)}` : ''}`
              : `${c.talentosCount} talento${c.talentosCount === 1 ? '' : 's'}${c.pendiente > 0 ? ` · pendiente ${fmt(c.pendiente)}` : ''}`}
            {...(c.pendiente > 0 ? { highlight: 'amber' as const } : {})}
          />
        ))}
      </Ranking>
    </div>
  );
}

function Ranking({ icon, title, emptyText, children }: {
  readonly icon: string;
  readonly title: string;
  readonly emptyText: string;
  readonly children: React.ReactNode;
}): React.ReactElement {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="rounded-2xl border border-sp-border bg-sp-admin-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg" aria-hidden>{icon}</span>
        <h2 className="text-sm font-bold text-sp-admin-fg">{title}</h2>
      </div>
      {!hasChildren ? (
        <p className="text-sm text-sp-admin-muted italic">{emptyText}</p>
      ) : (
        <ul className="space-y-2">{children}</ul>
      )}
    </section>
  );
}

function RankingRow({ idx, name, amount, subtext, highlight }: {
  readonly idx: number;
  readonly name: string;
  readonly amount: string;
  readonly subtext: string;
  readonly highlight?: 'amber';
}): React.ReactElement {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-sp-border/60 px-3 py-2.5">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-[11px] font-bold text-sp-admin-muted tabular-nums w-5">#{idx + 1}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-sp-admin-fg truncate">{name}</p>
          <p className={`text-[11px] mt-0.5 ${highlight === 'amber' ? 'text-amber-500' : 'text-sp-admin-muted'}`}>
            {subtext}
          </p>
        </div>
      </div>
      <p className="text-sm font-bold tabular-nums text-sp-admin-fg shrink-0">{amount}</p>
    </li>
  );
}
