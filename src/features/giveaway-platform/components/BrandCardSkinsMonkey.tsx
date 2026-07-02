import Image from 'next/image';
import { PLATFORM_BRANDS } from '../constants/brands';

interface Props {
  code: string;
}

export function BrandCardSkinsMonkey({ code }: Props) {
  const brand = PLATFORM_BRANDS.skinsmonkey;
  return (
    <div className="gp-card p-gold">
      <div className="glow" aria-hidden />
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
      <br />
      <button type="button" className="gp-btn btn-gold" data-todo="claim-code">
        Reclamar
      </button>
      {brand.agentAsset ? (
        <div className="gp-brand-agent-wrap" aria-hidden>
          <Image
            src={brand.agentAsset}
            alt=""
            width={220}
            height={280}
            className="gp-brand-agent"
            unoptimized
          />
        </div>
      ) : null}
    </div>
  );
}
