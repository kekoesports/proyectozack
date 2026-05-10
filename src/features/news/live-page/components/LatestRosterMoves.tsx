import type { SeedRosterMove } from '../data/seedRosterMoves';

const TYPE_INFO: Record<SeedRosterMove['type'], { label: string; icon: string; accent: string }> = {
  in:           { label: 'Fichaje',  icon: '↗', accent: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25' },
  out:          { label: 'Salida',   icon: '↘', accent: 'text-sp-pink   bg-sp-pink/10   border-sp-pink/25' },
  bench:        { label: 'Banco',    icon: '⊘', accent: 'text-white/55  bg-white/[0.04] border-white/15' },
  'role-change':{ label: 'Cambio',   icon: '↻', accent: 'text-sp-blue   bg-sp-blue/10   border-sp-blue/25' },
};

function relative(date: Date): string {
  const ms = Date.now() - date.getTime();
  const days = Math.floor(ms / 86400000);
  if (days === 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  const weeks = Math.floor(days / 7);
  return `hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
}

type Props = {
  readonly moves: readonly SeedRosterMove[];
};

export function LatestRosterMoves({ moves }: Props) {
  return (
    <section className="bg-[#0c1016] border border-white/[0.06] rounded-2xl overflow-hidden">
      <header className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/[0.04]">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sp-orange leading-none">
            Roster moves
          </p>
          <p className="text-[11px] text-white/40 mt-1.5 leading-none">
            Últimos movimientos · tier 2 EU
          </p>
        </div>
      </header>

      {moves.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-white/45">Sin movimientos recientes.</div>
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {moves.map((m) => {
            const info = TYPE_INFO[m.type];
            return (
              <li key={m.id} className="px-5 py-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 border ${info.accent}`}
                  >
                    <span aria-hidden className="text-base leading-none">{info.icon}</span>
                    {info.label}
                  </span>
                  <span className="font-display font-black uppercase text-sm tracking-tight text-white truncate">
                    {m.team}
                  </span>
                  <span aria-hidden className="text-white/15">·</span>
                  <span className="text-sm text-white/65 truncate">{m.playerName}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wider text-white/35 tabular-nums whitespace-nowrap">
                    {relative(m.date)}
                  </span>
                </div>
                <p className="text-xs text-white/55 leading-relaxed line-clamp-2">{m.note}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
