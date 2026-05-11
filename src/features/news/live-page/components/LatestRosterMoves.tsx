import type { SeedRosterMove } from '../data/seedRosterMoves';

type Tone = 'dark' | 'paper';

const TYPE_INFO: Record<SeedRosterMove['type'], { label: string; icon: string; accent: string; teamChip: string; rail: string }> = {
  in: {
    label: 'Fichaje',
    icon: '↗',
    accent: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25',
    teamChip: 'text-white bg-emerald-500/12 border-emerald-500/30',
    rail: 'bg-emerald-500/60',
  },
  out: {
    label: 'Salida',
    icon: '↘',
    accent: 'text-sp-pink bg-sp-pink/10 border-sp-pink/25',
    teamChip: 'text-white bg-sp-pink/12 border-sp-pink/30',
    rail: 'bg-sp-pink/60',
  },
  bench: {
    label: 'Banco',
    icon: '⊘',
    accent: 'text-white/55 bg-white/[0.04] border-white/15',
    teamChip: 'text-white bg-white/[0.06] border-white/15',
    rail: 'bg-white/20',
  },
  'role-change': {
    label: 'Cambio',
    icon: '↻',
    accent: 'text-sp-blue bg-sp-blue/10 border-sp-blue/25',
    teamChip: 'text-white bg-sp-blue/12 border-sp-blue/30',
    rail: 'bg-sp-blue/60',
  },
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
  readonly tone?: Tone;
};

export function LatestRosterMoves({ moves, tone = 'dark' }: Props) {
  const shellClass =
    tone === 'paper'
      ? 'bg-sp-black border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden'
      : 'bg-[#0c1016] border border-white/[0.06] rounded-2xl overflow-hidden';
  return (
    <section className={shellClass}>
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
              <li
                key={m.id}
                className="relative px-5 py-4 pl-6 hover:bg-white/[0.02] transition-colors"
              >
                <span
                  aria-hidden
                  className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full ${info.rail}`}
                />
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] rounded px-1.5 py-0.5 border ${info.accent} leading-none`}
                  >
                    <span aria-hidden className="text-sm leading-none">{info.icon}</span>
                    {info.label}
                  </span>
                  <span
                    className={`inline-flex items-center font-display font-black uppercase text-[13px] tracking-tight rounded px-2 py-0.5 border ${info.teamChip} leading-snug`}
                  >
                    {m.team}
                  </span>
                  <span className="font-display font-black uppercase text-[13px] tracking-tight text-white/85 truncate">
                    {m.playerName}
                  </span>
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
