import type { CalendarDay } from '../data/seedCalendar';

type Props = {
  readonly days: readonly CalendarDay[];
};

export function Calendar7Days({ days }: Props) {
  return (
    <section className="bg-[#0c1016] border border-white/[0.06] rounded-2xl overflow-hidden">
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

      <ul className="grid grid-cols-7">
        {days.map((day, i) => {
          const isToday = i === 0;
          const hasContent = day.matchCount > 0 || day.highlights.length > 0;
          return (
            <li
              key={day.date.toISOString()}
              className={`relative px-3 py-4 border-r border-white/[0.04] last:border-r-0 ${
                hasContent ? '' : 'opacity-40'
              } ${isToday ? 'bg-white/[0.025]' : ''}`}
            >
              <div className="flex flex-col items-center text-center mb-3">
                <span
                  className={`text-[9px] font-bold uppercase tracking-[0.18em] ${
                    isToday ? 'text-sp-orange' : 'text-white/45'
                  }`}
                >
                  {isToday ? 'Hoy' : day.weekday}
                </span>
                <span
                  className={`font-display font-black tabular-nums leading-none mt-0.5 ${
                    isToday ? 'text-white text-2xl' : 'text-white/85 text-xl'
                  }`}
                >
                  {day.dayLabel}
                </span>
              </div>

              <div className="space-y-1.5">
                {day.matchCount > 0 ? (
                  <div className="text-[10px] text-white/55 text-center font-medium">
                    {day.matchCount} {day.matchCount === 1 ? 'partido' : 'partidos'}
                  </div>
                ) : null}
                {day.highlights.map((h, hi) => {
                  const cls =
                    h.accent === 'primary'
                      ? 'bg-sp-orange/10 border-sp-orange/25 text-sp-orange'
                      : h.accent === 'secondary'
                        ? 'bg-sp-pink/10 border-sp-pink/25 text-sp-pink'
                        : 'bg-white/[0.03] border-white/10 text-white/45';
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
