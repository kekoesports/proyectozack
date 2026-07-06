import Link from 'next/link';
import type { PointsRankingRow, UserMonthlyStanding } from '@/types/giveawayPlatform';

interface Props {
  rows: readonly PointsRankingRow[];
  totalParticipants: number;
  myStanding: UserMonthlyStanding | null;
  isLoggedIn: boolean;
}

function daysLeftInMonth(): number {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const diffMs = end.getTime() - now.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function MonthlyPointsRanking({
  rows,
  totalParticipants,
  myStanding,
  isLoggedIn,
}: Props): React.ReactElement {
  const daysLeft = daysLeftInMonth();

  return (
    <div>
      <p className="gp-points-ranking-intro">
        Los usuarios que más puntos ganen completando misiones y rachas durante el mes ganan premios.
      </p>

      {rows.length === 0 ? (
        <p className="gp-points-ranking-empty">
          Aún nadie ha ganado puntos este mes. ¡Sé el primero completando misiones!
        </p>
      ) : (
        <div className="gp-points-ranking-list">
          {rows.map((row, idx) => {
            const position = idx + 1;
            const posClass = position === 1 ? 'is-top-1'
              : position === 2 ? 'is-top-2'
              : position === 3 ? 'is-top-3'
              : '';
            const isMe = myStanding?.rank === position;
            return (
              <div
                key={row.userId}
                className={`gp-points-ranking-row ${posClass}${isMe ? ' is-me' : ''}`}
              >
                <div className="gp-points-ranking-position">#{position}</div>
                <div className="gp-points-ranking-avatar">
                  {row.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.avatarUrl} alt="" />
                  ) : (
                    <span>{row.displayName.slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div className="gp-points-ranking-name">{row.displayName}</div>
                <div className="gp-points-ranking-points">
                  ⭐ {row.pointsEarned.toLocaleString('es-ES')}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoggedIn ? (
        <p className="gp-points-ranking-time-left">
          <Link href="/sorteos" style={{ color: 'var(--sp-pink, #e03070)', fontWeight: 700 }}>
            Inicia sesión con Steam
          </Link>{' '}
          para ver tu posición.
        </p>
      ) : myStanding ? (
        <div className="gp-points-ranking-me">
          <div>
            <span className="gp-points-ranking-me-label">Mi posición este mes: </span>
            <span className="gp-points-ranking-me-value">
              {myStanding.rank ? `#${myStanding.rank}` : 'Sin puntos aún'}
            </span>
          </div>
          <div>
            <span className="gp-points-ranking-me-label">Mis puntos: </span>
            <span className="gp-points-ranking-me-value">
              ⭐ {myStanding.pointsEarned.toLocaleString('es-ES')}
            </span>
          </div>
        </div>
      ) : null}

      <p className="gp-points-ranking-time-left">
        {totalParticipants > 0 ? `${totalParticipants.toLocaleString('es-ES')} jugadores este mes · ` : ''}
        {daysLeft === 0 ? 'Último día del mes' : `${daysLeft} día${daysLeft === 1 ? '' : 's'} restantes`}
      </p>
    </div>
  );
}
