import type { RankingRow } from '@/types/giveawayPlatform';

interface Props {
  rows: RankingRow[];
  totalPlayers: number;
  currentUserId: string | null;
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

/**
 * Server Component. Ranking global de la plataforma (agrega participaciones
 * en TODOS los creadores). Read-only: mide tickets, nunca dinero. Muestra
 * el total de jugadores del mes como contexto y resalta al usuario actual
 * si aparece en el top.
 */
export function MonthlyRanking({ rows, totalPlayers, currentUserId }: Props) {
  if (rows.length === 0) {
    // Empty state pequeño y honesto: el ranking se construye con
    // participaciones internas SocialPro (giveaway_entries), no con
    // sorteos externos KeyDrop.
    return (
      <aside className="gp-rank-empty-mini" aria-live="off">
        <span className="gp-rank-empty-mini-icon" aria-hidden>🎯</span>
        <span className="gp-rank-empty-mini-body">
          <b>Ranking mensual próximamente.</b>
          <span>Se activará cuando lleguen las primeras participaciones internas del mes.</span>
        </span>
      </aside>
    );
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
        Ranking global de la plataforma · Top {rows.length} de{' '}
        <b>{totalPlayers.toLocaleString('es-ES')}</b> jugadores este mes · mide
        tickets, no dinero · read-only
      </p>
      <div className="gp-rank-podium">
        {podiumOrder.map((row) => {
          if (!row) return null;
          const pos = rows.indexOf(row) + 1;
          const isMe = row.userId === currentUserId;
          return (
            <div key={row.userId} className={`gp-rank-podium-card p${pos}${isMe ? ' me' : ''}`}>
              <div className="gp-rank-avatar">{initials(row.displayName)}</div>
              <div className="gp-rank-pos">Puesto {pos}</div>
              <div className="gp-rank-name">
                {row.displayName}
                {isMe ? <span className="gp-rank-me-tag"> · tú</span> : null}
              </div>
              <span className="gp-rank-tickets">
                <b>{row.tickets.toLocaleString('es-ES')}</b> tickets
              </span>
            </div>
          );
        })}
      </div>
      {rest.length > 0 ? (
        <ol className="gp-rank-list">
          {rest.map((row, i) => {
            const isMe = row.userId === currentUserId;
            return (
              <li key={row.userId} className={isMe ? 'me' : undefined}>
                <span className="num">{i + 4}</span>
                <span className="who">
                  {row.displayName}
                  {isMe ? <span className="gp-rank-me-tag"> · tú</span> : null}
                </span>
                <span className="tix"><b>{row.tickets.toLocaleString('es-ES')}</b> tickets</span>
              </li>
            );
          })}
        </ol>
      ) : null}
    </>
  );
}
