import type { RankingRow } from '@/types/giveawayPlatform';

interface Props {
  rows: RankingRow[];
}

/** Server Component. El ranking mide tickets de participación, nunca dinero. */
export function MonthlyRanking({ rows }: Props) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Aún no hay participaciones este mes. ¡Sé el primero!</p>;
  }
  return (
    <ol className="divide-y divide-border rounded-xl border border-border bg-card">
      {rows.map((row, i) => (
        <li key={row.userId} className="flex items-center gap-4 px-5 py-3">
          <span className={`w-8 text-center text-lg font-bold ${
            i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-400' : 'text-muted-foreground'
          }`}>
            {i + 1}
          </span>
          <span className="flex-1 text-sm font-semibold">{row.displayName}</span>
          <span className="text-sm text-muted-foreground">🎟️ {row.tickets} tickets</span>
        </li>
      ))}
    </ol>
  );
}
