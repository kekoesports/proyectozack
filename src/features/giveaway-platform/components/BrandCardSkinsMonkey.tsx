import Image from 'next/image';
import { PLATFORM_BRANDS } from '../constants/brands';

interface Props {
  code: string;
}

/**
 * Card de SkinsMonkey rediseñada en patrón "hero-top":
 *   ┌───────────────────────┐
 *   │      HERO BANNER      │  — imagen ancho completo, altura fija
 *   ├───────────────────────┤
 *   │  Logo · texto · oferta │
 *   │  CTA                  │
 *   └───────────────────────┘
 *
 * Motivación: el patrón "agente flotante en esquina" que usan las otras
 * cards no encaja con SkinsMonkey porque la fuente del asset es una
 * thumbnail de baja resolución (comentario en constants/brands.ts). Con
 * un banner cover + object-position center + gradient overlay se
 * disimula el defecto y se le da más protagonismo visual.
 *
 * Reutiliza los tokens gold de `.p-gold` mediante la modificadora
 * `.p-monkey` (que además override el padding para permitir hero a full
 * ancho).
 */
export function BrandCardSkinsMonkey({ code }: Props) {
  const brand = PLATFORM_BRANDS.skinsmonkey;
  return (
    <div className="gp-card p-gold p-monkey">
      <div className="glow" aria-hidden />
      {brand.agentAsset ? (
        <div className="gp-monkey-hero" aria-hidden>
          <Image
            src={brand.agentAsset}
            alt=""
            fill
            sizes="(max-width: 720px) 100vw, 520px"
            className="gp-monkey-hero-img"
            unoptimized
          />
          <span className="gp-monkey-hero-overlay" aria-hidden />
        </div>
      ) : null}
      <div className="gp-monkey-body">
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
        <p className="gp-monkey-lead">
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
