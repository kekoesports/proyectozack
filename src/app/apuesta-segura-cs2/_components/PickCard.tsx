import type { ReactNode } from 'react';

type Status = 'live' | 'win' | 'pending';

const STATUS_STYLE: Record<Status, { dot: string; bg: string; text: string; label: string }> = {
  live: {
    dot: 'bg-sp-pink animate-pulse',
    bg: 'bg-sp-pink/10 border-sp-pink/30',
    text: 'text-sp-pink',
    label: 'En curso',
  },
  win: {
    dot: 'bg-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    text: 'text-emerald-400',
    label: 'Pick ganada',
  },
  pending: {
    dot: 'bg-white/40',
    bg: 'bg-white/5 border-white/10',
    text: 'text-white/60',
    label: 'Próxima',
  },
};

function TeamMark({ name }: { name: string }) {
  const initials = name.slice(0, 3).toUpperCase();
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="flex-none w-9 h-9 rounded-md bg-gradient-to-br from-white/15 to-white/5 border border-white/10 flex items-center justify-center font-display font-black text-[11px] tracking-tight text-white">
        {initials}
      </span>
      <span className="font-display font-black uppercase text-sm tracking-tight text-white truncate">
        {name}
      </span>
    </div>
  );
}

type Props = {
  readonly league: string;
  readonly teamA: string;
  readonly teamB: string;
  readonly map: string;
  readonly market: string;
  readonly odds: string;
  readonly stake: string;
  readonly when: string;
  readonly status: Status;
  readonly score?: string;
  readonly footer?: ReactNode;
};

export function PickCard({
  league,
  teamA,
  teamB,
  map,
  market,
  odds,
  stake,
  when,
  status,
  score,
}: Props) {
  const s = STATUS_STYLE[status];
  return (
    <article className="relative bg-[#0f1116] border border-white/[0.07] rounded-2xl p-4 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
            {league}
          </span>
          <span className="text-white/15">·</span>
          <span className="text-[10px] uppercase tracking-wider text-white/45">
            {map}
          </span>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 border ${s.bg} ${s.text}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
          {s.label}
        </span>
      </div>

      <div className="space-y-2 mb-3">
        <TeamMark name={teamA} />
        <div className="flex items-center justify-between pl-1">
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/30">
            vs
          </span>
          {score ? (
            <span className="font-display font-black text-white tabular-nums text-sm">
              {score}
            </span>
          ) : null}
        </div>
        <TeamMark name={teamB} />
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/[0.06]">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-white/35">
            Mercado
          </div>
          <div className="text-[11px] text-white/85 font-medium leading-tight mt-0.5 truncate">
            {market}
          </div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-white/35">
            Cuota
          </div>
          <div className="font-display font-black text-white tabular-nums text-base mt-0.5">
            @{odds}
          </div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-white/35">
            Stake
          </div>
          <div className="font-display font-black tabular-nums text-base mt-0.5 bg-sp-grad bg-clip-text text-transparent">
            {stake}
          </div>
        </div>
      </div>

      <div className="mt-3 text-[10px] text-white/30 uppercase tracking-wider">
        {when}
      </div>
    </article>
  );
}
