import Image from 'next/image';
import { PLATFORM_BRANDS } from '../constants/brands';
import { CsgoskinsRoadtripCountdown } from './CsgoskinsRoadtripCountdown';

interface Props {
  code: string;
}

/**
 * `endsAt` provisional del evento activo del partner (Dust II Roadtrip).
 * Fecha aproximada mientras confirmamos la exacta con CSGO-SKINS. Cambiar
 * aquí o mover a config por deal cuando lleguen más eventos.
 */
const CSGOSKINS_EVENT_ENDS_AT = '2026-07-26T22:18:00+02:00';

/**
 * Card CSGO-SKINS — patrón compacto con banner lateral + countdown live.
 *
 * Mismo esquema visual que la card compacta de SkinsMonkey: contenido a
 * la izquierda, media (banner del evento) a la derecha con máscara
 * horizontal que lo funde con el fondo. LED cyan (heredado de
 * `.gp-card-led` con tokens de `.p-red`).
 */
export function BrandCardCsgoskins({ code }: Props) {
  const brand = PLATFORM_BRANDS.csgoskins;
  return (
    <div className="gp-card gp-card-led p-red p-csgo-v2">
      <div className="glow" aria-hidden />
      {brand.agentAsset ? (
        <div className="gp-csgo-media" aria-hidden>
          <Image
            src={brand.agentAsset}
            alt=""
            fill
            sizes="(max-width: 720px) 100vw, 340px"
            className="gp-csgo-media-img"
            unoptimized
          />
        </div>
      ) : null}
      <div className="gp-csgo-content">
        <div className="gp-logo-slot">
          {brand.logoAsset ? (
            <Image
              src={brand.logoAsset}
              alt={brand.displayName}
              width={190}
              height={44}
              className="gp-brand-logo"
            />
          ) : (
            <div className="gp-brand-logo-fallback">{brand.displayName}</div>
          )}
        </div>
        <p className="gp-csgo-event-tag">Evento activo</p>
        <h3 className="gp-csgo-event-title">DUST II ROADTRIP</h3>
        <p className="gp-csgo-event-lead">Encuentra la caja oculta en la campaña del partner.</p>
        <CsgoskinsRoadtripCountdown endsAt={CSGOSKINS_EVENT_ENDS_AT} />
        <span className="pill-offer red">
          <b>5% Bonus + drops semanales</b> con el código <span>{code}</span>
        </span>
        <div>
          <button type="button" className="gp-btn btn-red" data-todo="claim-code">
            Ir a CSGO-SKINS
          </button>
        </div>
      </div>
    </div>
  );
}
