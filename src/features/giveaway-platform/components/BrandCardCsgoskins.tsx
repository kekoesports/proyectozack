import Image from 'next/image';
import { PLATFORM_BRANDS } from '../constants/brands';
import { CsgoskinsRoadtripCountdown } from './CsgoskinsRoadtripCountdown';
import { PartnerExternalNotice } from '@/components/partner/PartnerExternalNotice';

interface Props {
  code: string;
}

/**
 * `endsAt` provisional del evento activo del partner (Dust II Roadtrip).
 * Fecha aproximada mientras confirmamos la exacta con CSGO-SKINS. Cambiar
 * aquí o mover a config por deal cuando lleguen más eventos.
 */
const CSGOSKINS_EVENT_ENDS_AT = '2026-07-26T22:18:00+02:00';

// @allow-sensitive-copy: card de partner externo (CSGO-SKINS). "5% Bonus + drops semanales" es
// información objetiva del partner. Renderizado detrás de consent gate en `BrandBonusesSection`.

/**
 * Card CSGO-SKINS — patrón compacto con banner lateral + countdown live.
 *
 * Mismo esquema visual que la card compacta de SkinsMonkey: contenido a
 * la izquierda, media (banner del evento) a la derecha con máscara
 * horizontal que lo funde con el fondo. LED cyan (heredado de
 * `.gp-card-led` con tokens de `.p-red`).
 *
 * Fase 0 legal: `PartnerExternalNotice` obligatorio + consent gate upstream.
 */
/** URL de afiliado del partner. El `?ref=<code>` se construye desde el prop
 *  `code`, así que cada creador con card CSGO-SKINS abre su enlace propio.
 *  Fuente: dashboard de afiliados de CSGO-SKINS. Sin PII, sin secretos. */
function buildCsgoskinsAffiliateUrl(code: string): string {
  const safeCode = encodeURIComponent(code);
  return `https://csgo-skins.com/?ref=${safeCode}`;
}

export function BrandCardCsgoskins({ code }: Props) {
  const brand = PLATFORM_BRANDS.csgoskins;
  const affiliateUrl = buildCsgoskinsAffiliateUrl(code);
  return (
    <>
      <PartnerExternalNotice partner="CSGO-SKINS" category="skin_market" />
      <div className="gp-card gp-card-led p-red p-csgo-v2">
        <div className="glow" aria-hidden />
        {brand.agentAsset ? (
          <a
            href={affiliateUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="gp-csgo-media gp-cta-link"
            data-cta="csgoskins-banner"
            aria-label={`Ir a CSGO-SKINS con el código ${code}`}
          >
            <Image
              src={brand.agentAsset}
              alt=""
              fill
              sizes="(max-width: 720px) 100vw, 460px"
              className="gp-csgo-media-img"
              unoptimized
            />
          </a>
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
            <a
              href={affiliateUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="gp-btn btn-red gp-cta-link"
              data-cta="csgoskins-claim"
            >
              Ir a CSGO-SKINS
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
