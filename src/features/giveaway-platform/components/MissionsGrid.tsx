import type { MissionWithProgress } from '@/types/giveawayPlatform';

interface Props {
  missions: MissionWithProgress[];
}

/** Server Component: solo lectura. El cobro es automático en servidor. */
export function MissionsGrid({ missions }: Props) {
  if (missions.length === 0) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {missions.map((m) => {
        const pct = Math.round((m.current / m.goal) * 100);
        return (
          <div
            key={m.id}
            className={`rounded-xl border p-4 ${m.claimed ? 'border-emerald-600/50' : 'border-border'} bg-card`}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold">{m.claimed ? '✅ ' : ''}{m.title}</h3>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                m.claimed ? 'bg-emerald-600/20 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
              }`}>
                {m.claimed ? 'Cobrado' : `+${m.rewardCoins} 🪙`}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{m.description}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
              <span>{m.current} / {m.goal}</span>
              <span>{m.claimed ? 'Completada' : `${pct}%`}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
