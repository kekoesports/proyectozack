import type { RankingRow } from '@/types/giveawayPlatform';

interface Props {
  rows: RankingRow[];
}

function initials(name: string): string {
  const clean = name.replace(/[^\p{L}\p{N}\s]/gu, '').trim();
  if (!clean) return '?';
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    const a = parts[0]?.[0] ?? '';
    const b = parts[1]?.[0] ?? '';
    return (a + b).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

/** Server Component. El ranking mide tickets de participación, nunca dinero. */
export function MonthlyRanking({ rows }: Props) {
  if (rows.length === 0) {
    return <p className="gp-rank-empty">Aún no hay participaciones este mes. ¡Sé el primero!</p>;
  }
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
  // Podium visual: [2º] [1º] [3º] — el 1º va al centro.
  const podiumOrder = podium.length === 1
    ? [podium[0]]
    : podium.length === 2
      ? [podium[1], podium[0]]
      : [podium[1], podium[0], podium[2]];

  return (
    <>
      <p className="gp-rank-note">
        Mide participación (tickets), nunca dinero. Los perfiles privados aparecen enmascarados.
      </p>
      <div className="gp-rank-podium">
        {podiumOrder.map((row) => {
          if (!row) return null;
          const pos = rows.indexOf(row) + 1;
          return (
            <div key={row.userId} className={`gp-rank-podium-card p${pos}`}>
              <div className="gp-rank-avatar">{initials(row.displayName)}</div>
              <div className="gp-rank-pos">Puesto {pos}</div>
              <div className="gp-rank-name">{row.displayName}</div>
              <span className="gp-rank-tickets">
                <b>{row.tickets.toLocaleString('es-ES')}</b> tickets
              </span>
            </div>
          );
        })}
      </div>
      {rest.length > 0 ? (
        <ol className="gp-rank-list">
          {rest.map((row, i) => (
            <li key={row.userId}>
              <span className="num">{i + 4}</span>
              <span className="who">{row.displayName}</span>
              <span className="tix"><b>{row.tickets.toLocaleString('es-ES')}</b> tickets</span>
            </li>
          ))}
        </ol>
      ) : null}
    </>
  );
}
