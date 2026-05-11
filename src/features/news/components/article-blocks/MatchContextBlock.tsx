import type { MatchContext, MatchStatus } from './types';

const STATUS_LABEL: Record<MatchStatus, string> = {
  won: 'Partido ganado',
  lost: 'Partido perdido',
  live: 'En curso',
  upcoming: 'Próximo',
};

const STATUS_PILL: Record<MatchStatus, string> = {
  won: 'text-emerald-300 bg-emerald-500/12 border-emerald-500/40',
  lost: 'text-sp-pink bg-sp-pink/10 border-sp-pink/30',
  live: 'text-red-300 bg-red-500/15 border-red-500/45',
  upcoming: 'text-white/65 bg-white/[0.04] border-white/15',
};

type Props = { readonly match: MatchContext };

export function MatchContextBlock({ match }: Props) {
  const winnerA = match.teamA.score > match.teamB.score;
  const winnerB = match.teamB.score > match.teamA.score;
  const isLive = match.status === 'live';

  return (
    <section className="relative max-w-5xl mx-auto px-5 md:px-8 mt-8 md:mt-10">
      <div className="relative bg-sp-black border border-white/[0.08] rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(245,99,42,0.03)]">
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 md:px-7 pt-5 pb-4 border-b border-white/[0.05]">
          <div className="flex flex-wrap items-baseline gap-2 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sp-orange leading-none">
              {match.event}
            </p>
            {match.stage ? (
              <>
                <span aria-hidden className="text-white/20">·</span>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55 leading-none">
                  {match.stage}
                </p>
              </>
            ) : null}
            <span aria-hidden className="text-white/20">·</span>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40 leading-none">
              {match.format}
            </p>
          </div>
          <span
            className={`flex-none inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] rounded-full px-2.5 py-1 border ${STATUS_PILL[match.status]} leading-none`}
          >
            {isLive ? (
              <span aria-hidden className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-red-500 motion-safe:animate-ping opacity-70" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-red-500" />
              </span>
            ) : null}
            {STATUS_LABEL[match.status]}
          </span>
        </header>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 md:gap-6 px-5 md:px-7 py-6 md:py-7">
          <div className={`text-right min-w-0 ${winnerA ? '' : 'opacity-65'}`}>
            <p className="font-display font-black uppercase tracking-tight text-xl md:text-3xl leading-[1.05] truncate text-white">
              {match.teamA.name}
            </p>
          </div>
          <div className="flex items-center gap-2 md:gap-3 flex-none">
            <span
              className={`font-display font-black tabular-nums text-4xl md:text-6xl leading-none ${winnerA ? 'text-white' : 'text-white/40'}`}
            >
              {match.teamA.score}
            </span>
            <span aria-hidden className="text-white/15 text-2xl md:text-3xl font-display font-black">
              —
            </span>
            <span
              className={`font-display font-black tabular-nums text-4xl md:text-6xl leading-none ${winnerB ? 'text-white' : 'text-white/40'}`}
            >
              {match.teamB.score}
            </span>
          </div>
          <div className={`text-left min-w-0 ${winnerB ? '' : 'opacity-65'}`}>
            <p className="font-display font-black uppercase tracking-tight text-xl md:text-3xl leading-[1.05] truncate text-white">
              {match.teamB.name}
            </p>
          </div>
        </div>

        {match.maps.length > 0 ? (
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/[0.05] border-t border-white/[0.05]">
            {match.maps.map((m, i) => {
              const mapWinnerA = m.scoreA > m.scoreB;
              return (
                <li key={`${m.name}-${i}`} className="bg-sp-black px-5 py-4">
                  <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/40 mb-1.5 leading-none">
                    Mapa {i + 1}
                  </p>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-display font-black uppercase text-base md:text-lg tracking-tight text-white truncate">
                      {m.name}
                    </span>
                    <span className="flex-none font-display font-black tabular-nums text-base md:text-lg leading-none">
                      <span className={mapWinnerA ? 'text-emerald-300' : 'text-white/55'}>{m.scoreA}</span>
                      <span aria-hidden className="text-white/20 mx-1">—</span>
                      <span className={!mapWinnerA ? 'text-emerald-300' : 'text-white/55'}>{m.scoreB}</span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
