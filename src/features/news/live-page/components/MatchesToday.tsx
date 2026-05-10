import type { SeedMatch } from '../data/seedMatches';

const STATUS_BADGE: Record<SeedMatch['status'], { label: string; cls: string }> = {
  upcoming: { label: 'Próximo', cls: 'text-white/55 bg-white/[0.04] border-white/10' },
  live: { label: 'Live', cls: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' },
  finished: { label: 'Final', cls: 'text-white/45 bg-white/[0.03] border-white/10' },
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
}

type Props = {
  readonly matches: readonly SeedMatch[];
};

export function MatchesToday({ matches }: Props) {
  return (
    <section className="bg-[#0c1016] border border-white/[0.06] rounded-2xl overflow-hidden">
      <header className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/[0.04]">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sp-orange leading-none">
            Partidos hoy
          </p>
          <p className="text-[11px] text-white/40 mt-1.5 leading-none">
            {matches.length === 0
              ? 'Sin partidos programados'
              : `${matches.length} ${matches.length === 1 ? 'partido' : 'partidos'} en agenda`}
          </p>
        </div>
      </header>

      {matches.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-white/45">
          Próximos partidos en el calendario semanal abajo.
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {matches.map((m) => {
            const badge = STATUS_BADGE[m.status];
            return (
              <li key={m.slug} className="px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45 truncate">
                      {m.league}
                    </span>
                    <span aria-hidden className="text-white/15">·</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/35">
                      {m.format}
                    </span>
                  </div>
                  <span
                    className={`flex-none inline-flex items-center text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 border ${badge.cls}`}
                  >
                    {badge.label}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-display font-black uppercase text-sm tracking-tight text-white truncate">
                      {m.teamA}
                    </span>
                    <span className="text-white/30 text-xs flex-none">vs</span>
                    <span className="font-display font-black uppercase text-sm tracking-tight text-white truncate">
                      {m.teamB}
                    </span>
                  </div>
                  <span className="flex-none font-display font-black tabular-nums text-sm text-white/85">
                    {formatTime(m.scheduledAt)}
                  </span>
                </div>
                {m.map ? (
                  <p className="text-[11px] text-white/35 mt-1.5 truncate">{m.map}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
