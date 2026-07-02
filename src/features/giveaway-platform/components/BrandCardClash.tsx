import Image from 'next/image';
import { PLATFORM_BRANDS } from '../constants/brands';

interface Props {
  code: string;
}

export function BrandCardClash({ code }: Props) {
  const brand = PLATFORM_BRANDS.clash;
  return (
    <div className="gp-card p-gold">
      <div className="glow" aria-hidden />
      <div className="gp-logo-slot">
        {brand.logoAsset ? (
          <Image
            src={brand.logoAsset}
            alt={brand.displayName}
            width={170}
            height={44}
            className="gp-brand-logo"
          />
        ) : (
          <div className="gp-brand-logo-fallback">{brand.displayName}</div>
        )}
      </div>
      <p className="gp-resp" style={{ margin: '12px 0 10px' }}>{brand.disclaimer}</p>
      <span className="pill-offer">
        <b>5% Bonus + 3 cajas gratis</b> con el código <span>{code}</span>
      </span>
      <br />
      <span className="pill-offer">
        <b>Hasta 100%</b> en tu primer depósito
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
          />
        </div>
      ) : null}
    </div>
  );
}
