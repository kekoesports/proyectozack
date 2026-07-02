import type { MissionWithProgress } from '@/types/giveawayPlatform';

interface Props {
  missions: MissionWithProgress[];
}

/** Server Component: solo lectura. El cobro es automático en servidor. */
export function MissionsGrid({ missions }: Props) {
  if (missions.length === 0) {
    return <p className="gp-mission-head">No hay misiones activas este mes.</p>;
  }
  return (
    <>
      <p className="gp-mission-head">Las monedas de todos los creadores se suman al mismo saldo.</p>
      <div className="gp-missions-grid">
        {missions.map((m) => {
          const pct = m.goal > 0 ? Math.min(100, Math.round((m.current / m.goal) * 100)) : 0;
          return (
            <div key={m.id} className={`gp-mission-card${m.claimed ? ' is-done' : ''}`}>
              <div className="gp-mission-row">
                <h3 className="gp-mission-title">{m.claimed ? '✓ ' : ''}{m.title}</h3>
                <span className={`gp-mission-reward${m.claimed ? ' is-done' : ''}`}>
                  {m.claimed ? 'Cobrado' : `+${m.rewardCoins} 🪙`}
                </span>
              </div>
              <p className="gp-mission-desc">{m.description}</p>
              <div className="gp-mission-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="gp-mission-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="gp-mission-foot">
                <span>{m.current} / {m.goal}</span>
                <span>{m.claimed ? 'Completada' : `${pct}%`}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
