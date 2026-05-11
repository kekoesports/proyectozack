import type { CalendarDay } from '../data/seedCalendar';

type Tone = 'dark' | 'paper';

type Props = {
  readonly days: readonly CalendarDay[];
  readonly tone?: Tone;
};

export function Calendar7Days({ days, tone = 'dark' }: Props) {
  const shellClass =
    tone === 'paper'
      ? 'bg-sp-black border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden'
      : 'bg-[#0c1016] border border-white/[0.06] rounded-2xl overflow-hidden';
  return (
    <section className={shellClass}>
      <header className="flex items-center justify-between px-5 md:px-6 pt-5 pb-3 border-b border-white/[0.04]">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sp-orange leading-none">
            Próximos 7 días
          </p>
          <p className="text-[11px] text-white/40 mt-1.5 leading-none">
            Calendario competitivo · CS2
          </p>
        </div>
      </header>

      <ul className="flex md:grid md:grid-cols-7 overflow-x-auto snap-x snap-mandatory scroll-px-2 md:overflow-visible">
        {days.map((day, i) => {
          const isToday = i === 0;
          const hasContent = day.matchCount > 0 || day.highlights.length > 0;
          return (
            <li
              key={day.date.toISOString()}
              className={`relative flex-none snap-start min-w-[88px] md:min-w-0 px-3 md:px-4 py-5 md:py-6 border-r border-white/[0.04] last:border-r-0 ${
                hasContent ? '' : 'opacity-40'
              } ${isToday ? 'bg-white/[0.04]' : ''}`}
            >
              {isToday ? (
                <span
                  aria-hidden
                  className="absolute top-0 inset-x-0 h-[2px] bg-sp-orange"
                />
              ) : null}
              <div className="flex flex-col items-center text-center mb-3">
                <span
                  className={`text-[10px] font-bold uppercase tracking-[0.22em] ${
                    isToday ? 'text-sp-orange' : 'text-white/50'
                  }`}
                >
                  {isToday ? 'Hoy' : day.weekday}
                </span>
                <span
                  className={`font-display font-black tabular-nums leading-none mt-1 ${
                    isToday ? 'text-white text-3xl md:text-4xl' : 'text-white/90 text-2xl md:text-[28px]'
                  }`}
                >
                  {day.dayLabel}
                </span>
              </div>

              <div className="space-y-1.5">
                {day.matchCount > 0 ? (
                  <div className="text-[10px] text-white/65 text-center font-medium leading-none">
                    <span className="font-display font-black tabular-nums text-white text-base mr-1">
                      {day.matchCount}
                    </span>
                    {day.matchCount === 1 ? 'partido' : 'partidos'}
                  </div>
                ) : null}
                {day.highlights.map((h, hi) => {
                  const cls =
                    h.accent === 'primary'
                      ? 'bg-sp-orange/15 border-sp-orange/35 text-sp-orange'
                      : h.accent === 'secondary'
                        ? 'bg-sp-pink/15 border-sp-pink/35 text-sp-pink'
                        : 'bg-white/[0.05] border-white/15 text-white/55';
                  return (
                    <div
                      key={hi}
                      className={`text-[9px] uppercase tracking-wider rounded px-1.5 py-0.5 border text-center leading-tight line-clamp-2 ${cls}`}
                    >
                      {h.label}
                    </div>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
