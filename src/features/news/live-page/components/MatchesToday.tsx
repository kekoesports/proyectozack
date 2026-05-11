import { cache } from 'react';
import type { SeedMatch } from '../data/seedMatches';

const getNow = cache(() => Date.now());

const STATUS_BADGE: Record<SeedMatch['status'], { label: string; cls: string }> = {
  upcoming: { label: 'Próximo', cls: 'text-white/55 bg-white/[0.04] border-white/10' },
  live: { label: 'Live', cls: 'text-red-300 bg-red-500/15 border-red-500/45' },
  finished: { label: 'Final', cls: 'text-white/45 bg-white/[0.03] border-white/10' },
};

const IMMINENT_THRESHOLD_MS = 30 * 60 * 1000;

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function timeUntil(date: Date, now: number): string | null {
  const ms = date.getTime() - now;
  if (ms <= 0) return null;
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'comienza ya';
  if (min < 60) return `en ${min} min`;
  const h = Math.floor(min / 60);
  const rem = min % 60;
  if (h < 24) return rem > 0 ? `en ${h}h ${rem}m` : `en ${h}h`;
  return null;
}

type Props = {
  readonly matches: readonly SeedMatch[];
};

export function MatchesToday({ matches }: Props) {
  const now = getNow();
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
            const isLive = m.status === 'live';
            const countdown =
              m.status === 'upcoming' ? timeUntil(m.scheduledAt, now) : null;
            const imminent =
              m.status === 'upcoming' &&
              m.scheduledAt.getTime() - now <= IMMINENT_THRESHOLD_MS &&
              m.scheduledAt.getTime() - now > 0;
            return (
              <li
                key={m.slug}
                className={`relative px-5 py-3.5 hover:bg-white/[0.02] transition-colors ${
                  imminent ? 'border-l-2 border-sp-orange' : ''
                }`}
              >
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
                    className={`flex-none inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.22em] rounded-full px-2 py-0.5 border ${badge.cls}`}
                  >
                    {isLive ? (
                      <span aria-hidden className="relative flex w-1.5 h-1.5">
                        <span className="absolute inset-0 rounded-full bg-red-500 motion-safe:animate-ping opacity-70" />
                        <span className="relative w-1.5 h-1.5 rounded-full bg-red-500" />
                      </span>
                    ) : null}
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
                  <span
                    className={`flex-none font-display font-black tabular-nums text-sm ${
                      imminent ? 'text-sp-orange' : 'text-white/85'
                    }`}
                  >
                    {countdown ?? formatTime(m.scheduledAt)}
                  </span>
                </div>
                {m.map || countdown ? (
                  <p className="text-[11px] text-white/35 mt-1.5 truncate">
                    {m.map ? m.map : null}
                    {m.map && countdown ? ' · ' : null}
                    {countdown ? formatTime(m.scheduledAt) : null}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
