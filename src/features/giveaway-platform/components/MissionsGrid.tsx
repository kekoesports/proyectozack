'use client';

import { useState } from 'react';
import type { MissionWithProgress } from '@/types/giveawayPlatform';

interface Props {
  missions: MissionWithProgress[];
}

/**
 * Muestra 4 misiones destacadas + botón "Ver más" que expande el resto.
 * Prioridad de destacadas:
 *   1) Misiones cobradas se envían al final para no ocupar el top.
 *   2) Entre las no cobradas, respeta el `sortOrder` que viene del server.
 */
export function MissionsGrid({ missions }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (missions.length === 0) {
    return <p className="gp-mission-head">No hay misiones activas este mes.</p>;
  }

  // Cobradas al final, resto en el orden que llega del server (sortOrder ASC).
  const sorted = [...missions].sort((a, b) => Number(a.claimed) - Number(b.claimed));

  const FEATURED_COUNT = 4;
  const featured = sorted.slice(0, FEATURED_COUNT);
  const rest = sorted.slice(FEATURED_COUNT);
  const visible = expanded ? sorted : featured;

  return (
    <>
      <p className="gp-mission-head">Los puntos de todos los creadores se suman al mismo saldo.</p>
      <div className="gp-missions-grid">
        {visible.map((m) => {
          const pct = m.goal > 0 ? Math.min(100, Math.round((m.current / m.goal) * 100)) : 0;
          return (
            <div key={m.id} className={`gp-mission-card${m.claimed ? ' is-done' : ''}`}>
              <div className="gp-mission-row">
                <h3 className="gp-mission-title">{m.claimed ? '✓ ' : ''}{m.title}</h3>
                <span className={`gp-mission-reward${m.claimed ? ' is-done' : ''}`}>
                  {m.claimed ? 'Cobrado' : `+${m.rewardCoins} ⭐`}
                </span>
              </div>
              <p className="gp-mission-desc">{m.description}</p>
              <div
                className="gp-mission-bar"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
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
      {rest.length > 0 ? (
        <button
          type="button"
          className="gp-missions-more"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? 'Ver menos' : `Ver ${rest.length} misiones más`}
        </button>
      ) : null}
      <YoutubeMissionsPlaceholder />
    </>
  );
}

/**
 * Placeholder informativo — misiones YouTube "Próximamente".
 *
 * NO tiene botón de reclamar, verificar ni conectar. NO concede puntos.
 * NO simula verificación. Sólo comunica que la fase 2 (OAuth Google +
 * verificación real vía YouTube Data API v3) está en preparación.
 *
 * Ver `docs/youtube-missions-verification.md` para el plan por fases.
 */
function YoutubeMissionsPlaceholder() {
  return (
    <div
      className="gp-missions-yt-placeholder"
      role="note"
      aria-label="Misiones YouTube próximamente"
    >
      <div className="gp-missions-yt-icon" aria-hidden>
        📺
      </div>
      <div className="gp-missions-yt-body">
        <div className="gp-missions-yt-title">
          Misiones YouTube <span className="gp-missions-yt-soon">· Próximamente</span>
        </div>
        <p className="gp-missions-yt-desc">
          Conecta tu cuenta y completa acciones verificables (suscribirte a un canal,
          comentar en un vídeo) para ganar puntos. Estamos preparando la integración
          para que la verificación sea real y segura.
        </p>
      </div>
    </div>
  );
}
