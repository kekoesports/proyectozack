import Image from 'next/image';
import { PLATFORM_BRANDS } from '../constants/brands';

interface Props {
  code: string;
}

/**
 * Card de SkinsMonkey compacta.
 *
 * Historial:
 *   - v0: patrón "agente flotante" heredado. La foto se veía pequeña.
 *   - v1 (PR #176): patrón "hero-top" con banner cover a ancho completo.
 *     Rechazado — hacía la card mucho más alta que CSGO-SKINS a su lado
 *     y descompensaba la fila `.gp-grid-2`.
 *   - v2 (este): card compacta con altura equivalente a CSGO-SKINS. La
 *     imagen se contiene en un "media block" a la derecha con dimensiones
 *     controladas y `object-fit: cover` + máscara lateral para que se
 *     integre mejor con el contenido. El logo amarillo se refuerza como
 *     marca de identidad detrás del bloque de contenido, difuminado.
 */
export function BrandCardSkinsMonkey({ code }: Props) {
  const brand = PLATFORM_BRANDS.skinsmonkey;
  return (
    <div className="gp-card gp-card-led p-gold p-monkey-v2">
      <div className="glow" aria-hidden />
      {brand.agentAsset ? (
        <div className="gp-monkey-media" aria-hidden>
          <Image
            src={brand.agentAsset}
            alt=""
            fill
            sizes="240px"
            className="gp-monkey-media-img"
            unoptimized
          />
        </div>
      ) : null}
      <div className="gp-monkey-content">
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
        <p style={{ fontSize: 14, margin: '12px 0 10px' }}>
          Compra e intercambia skins de forma rápida y segura
        </p>
        <span className="pill-offer">
          <b>35% Bonus + hasta 5$ Gratis</b> con el código <span>{code}</span>
        </span>
        <div>
          <button type="button" className="gp-btn btn-gold" data-todo="claim-code">
            Reclamar
          </button>
        </div>
      </div>
    </div>
  );
}
