import Link from 'next/link';
import type { PointsRankingRow, UserMonthlyStanding } from '@/types/giveawayPlatform';
import {
  getCurrentMonthPrizes,
  getCurrentPrizeForPosition,
  monthNameEs,
  currentMonthKey,
  type RankingPrize,
} from '@/features/giveaway-platform/constants/prizes';

const PODIUM_EMOJI: Readonly<Record<number, string>> = { 1: '🥇', 2: '🥈', 3: '🥉' };
const PODIUM_LABEL: Readonly<Record<number, string>> = { 1: '1.º', 2: '2.º', 3: '3.º' };

function InlinePrize({ prize }: { prize: RankingPrize }): React.ReactElement {
  return (
    <div className="gp-points-ranking-prize" aria-label={`Premio para el puesto ${prize.position}`}>
      <div className="gp-points-ranking-prize-media">
        {prize.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={prize.imageUrl} alt="" />
        ) : (
          <span className="gp-points-ranking-prize-fallback" aria-hidden>
            {PODIUM_EMOJI[prize.position] ?? '🎁'}
          </span>
        )}
      </div>
      <div className="gp-points-ranking-prize-body">
        <p className="gp-points-ranking-prize-title">{prize.title}</p>
        {prize.description ? (
          <p className="gp-points-ranking-prize-desc">{prize.description}</p>
        ) : null}
      </div>
    </div>
  );
}

function Avatar({
  name,
  avatarUrl,
  size = 'md',
}: {
  name: string;
  avatarUrl: string | null;
  size?: 'sm' | 'md' | 'lg';
}): React.ReactElement {
  return (
    <div className={`gp-points-ranking-avatar is-${size}`} aria-hidden={Boolean(avatarUrl)}>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" />
      ) : (
        <span>{name.slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );
}

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

function PodiumCard({
  row,
  position,
  isMe,
}: {
  row: PointsRankingRow;
  position: 1 | 2 | 3;
  isMe: boolean;
}): React.ReactElement {
  const prize = getCurrentPrizeForPosition(position);
  return (
    <article
      className={`gp-points-podium-card p${position}${isMe ? ' is-me' : ''}`}
      aria-label={`Puesto ${position}: ${row.displayName}, ${row.pointsEarned} puntos`}
    >
      <div className="gp-points-podium-medal" aria-hidden>
        {PODIUM_EMOJI[position]}
      </div>
      <div className="gp-points-podium-rank">{PODIUM_LABEL[position]}</div>
      <Avatar name={row.displayName} avatarUrl={row.avatarUrl} size={position === 1 ? 'lg' : 'md'} />
      <div className="gp-points-podium-name">
        {row.displayName}
        {isMe ? <span className="gp-rank-me-tag"> · tú</span> : null}
      </div>
      <div className="gp-points-podium-points">
        <span className="gp-points-podium-points-star" aria-hidden>★</span>
        {row.pointsEarned.toLocaleString('es-ES')}
        <span className="gp-points-podium-points-unit">pts</span>
      </div>
      {prize ? <InlinePrize prize={prize} /> : null}
    </article>
  );
}

function RestRow({
  row,
  position,
  isMe,
}: {
  row: PointsRankingRow;
  position: number;
  isMe: boolean;
}): React.ReactElement {
  return (
    <li className={`gp-points-rest-row${isMe ? ' is-me' : ''}`}>
      <span className="gp-points-rest-pos">#{position}</span>
      <Avatar name={row.displayName} avatarUrl={row.avatarUrl} size="sm" />
      <span className="gp-points-rest-name">
        {row.displayName}
        {isMe ? <span className="gp-rank-me-tag"> · tú</span> : null}
      </span>
      <span className="gp-points-rest-points">
        ★ {row.pointsEarned.toLocaleString('es-ES')}
      </span>
    </li>
  );
}

export function MonthlyPointsRanking({
  rows,
  totalParticipants,
  myStanding,
  isLoggedIn,
}: Props): React.ReactElement {
  const daysLeft = daysLeftInMonth();
  const monthLabel = monthNameEs(currentMonthKey());
  const prizeConfig = getCurrentMonthPrizes();

  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);

  // Visual order: 2º · 1º · 3º (1º centrado y más alto).
  const podiumVisual: Array<{ row: PointsRankingRow; position: 1 | 2 | 3 } | null> =
    podium.length === 0
      ? []
      : podium.length === 1
        ? [
            null,
            { row: podium[0]!, position: 1 },
            null,
          ]
        : podium.length === 2
          ? [
              { row: podium[1]!, position: 2 },
              { row: podium[0]!, position: 1 },
              null,
            ]
          : [
              { row: podium[1]!, position: 2 },
              { row: podium[0]!, position: 1 },
              { row: podium[2]!, position: 3 },
            ];

  const daysLabel =
    daysLeft === 0
      ? 'Último día del mes'
      : `${daysLeft} día${daysLeft === 1 ? '' : 's'} restantes`;

  return (
    <div className="gp-points-ranking">
      <header className="gp-points-ranking-header">
        <div className="gp-points-ranking-header-copy">
          <p className="gp-points-ranking-kicker">Temporada en curso</p>
          <h3 className="gp-points-ranking-title">Ranking · {monthLabel}</h3>
          <p className="gp-points-ranking-intro">
            Los usuarios que más puntos ganen completando misiones y rachas durante el mes
            ganan premios.
          </p>
        </div>
        <div className="gp-points-ranking-meta" aria-label="Resumen del ranking">
          {totalParticipants > 0 ? (
            <span className="gp-points-ranking-chip">
              <b>{totalParticipants.toLocaleString('es-ES')}</b> jugadores
            </span>
          ) : null}
          <span className="gp-points-ranking-chip is-accent">
            <b>{daysLabel}</b>
          </span>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="gp-points-ranking-empty-state" role="status">
          <span className="gp-points-ranking-empty-icon" aria-hidden>🏆</span>
          <p className="gp-points-ranking-empty-title">Nadie en el podio todavía</p>
          <p className="gp-points-ranking-empty">
            Aún nadie ha ganado puntos este mes. ¡Sé el primero completando misiones!
          </p>
        </div>
      ) : (
        <>
          <div className="gp-points-podium" role="list" aria-label="Top 3 del mes">
            {podiumVisual.map((slot, idx) => {
              if (!slot) {
                return <div key={`empty-${idx}`} className="gp-points-podium-slot is-empty" aria-hidden />;
              }
              const isMe = myStanding?.rank === slot.position;
              return (
                <div key={slot.row.userId} className="gp-points-podium-slot" role="listitem">
                  <PodiumCard row={slot.row} position={slot.position} isMe={Boolean(isMe)} />
                </div>
              );
            })}
          </div>

          {rest.length > 0 ? (
            <ol className="gp-points-rest-list" start={4} aria-label="Resto del ranking">
              {rest.map((row, idx) => {
                const position = idx + 4;
                const isMe = myStanding?.rank === position;
                return (
                  <RestRow
                    key={row.userId}
                    row={row}
                    position={position}
                    isMe={Boolean(isMe)}
                  />
                );
              })}
            </ol>
          ) : null}
        </>
      )}

      {!isLoggedIn ? (
        <p className="gp-points-ranking-time-left">
          <Link href="/sorteos" className="gp-points-ranking-login-link">
            Inicia sesión con Steam
          </Link>{' '}
          para ver tu posición.
        </p>
      ) : myStanding ? (
        <div className="gp-points-ranking-me">
          <div className="gp-points-ranking-me-rank">
            <span className="gp-points-ranking-me-label">Mi posición</span>
            <span className="gp-points-ranking-me-value">
              {myStanding.rank ? `#${myStanding.rank}` : 'Sin puntos aún'}
            </span>
          </div>
          <div className="gp-points-ranking-me-points">
            <span className="gp-points-ranking-me-label">Mis puntos</span>
            <span className="gp-points-ranking-me-value">
              ★ {myStanding.pointsEarned.toLocaleString('es-ES')}
            </span>
          </div>
        </div>
      ) : null}

      {prizeConfig?.notice ? (
        <p className="gp-points-ranking-notice">{prizeConfig.notice}</p>
      ) : null}
    </div>
  );
}
