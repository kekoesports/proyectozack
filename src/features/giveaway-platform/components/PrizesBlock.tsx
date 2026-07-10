import {
  currentMonthKey,
  getCurrentMonthPrizes,
  monthNameEs,
} from '@/features/giveaway-platform/constants/prizes';

/**
 * Bloque visible "Premios del ranking mensual". Sin admin panel: se
 * configura editando `constants/prizes.ts`. Si el mes actual no está
 * configurado, muestra estado "próximamente" sin inventar premios.
 *
 * No entrega automáticamente — es solo copy informativo.
 */
export function PrizesBlock(): React.ReactElement {
  const monthKey = currentMonthKey();
  const config = getCurrentMonthPrizes();
  const monthLabel = monthNameEs(monthKey);

  if (!config || config.prizes.length === 0) {
    return (
      <div className="gp-prizes-block">
        <p className="gp-prizes-title">Premios del ranking mensual</p>
        <p className="gp-prizes-subtitle">
          Premios de {monthLabel} próximamente.
        </p>
      </div>
    );
  }

  return (
    <div className="gp-prizes-block">
      <p className="gp-prizes-title">Premios del ranking mensual · {monthLabel}</p>
      <p className="gp-prizes-subtitle">
        Los top 3 del ranking mensual reciben premios exclusivos de SocialPro.
      </p>
      <ul className="gp-prizes-list">
        {config.prizes.map((p) => (
          <li key={p.position} className={`gp-prize-item pos-${p.position}`}>
            <div className="gp-prize-position">Top {p.position}</div>
            {p.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="gp-prize-image" src={p.imageUrl} alt="" />
            ) : null}
            <p className="gp-prize-title">{p.title}</p>
            {p.description ? <p className="gp-prize-desc">{p.description}</p> : null}
          </li>
        ))}
      </ul>
      {config.notice ? <p className="gp-prizes-notice">{config.notice}</p> : null}
    </div>
  );
}
