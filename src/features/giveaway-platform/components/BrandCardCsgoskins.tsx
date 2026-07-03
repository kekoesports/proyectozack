import Image from 'next/image';
import { PLATFORM_BRANDS } from '../constants/brands';

interface Props {
  code: string;
}

export function BrandCardCsgoskins({ code }: Props) {
  const brand = PLATFORM_BRANDS.csgoskins;
  return (
    <div className="gp-card gp-card-led p-red">
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
      <p className="gp-resp" style={{ margin: '12px 0 10px' }}>{brand.disclaimer}</p>
      <span className="pill-offer red">
        <b>5% Bonus + drops semanales</b> con el código <span>{code}</span>
      </span>
      <br />
      <span className="pill-offer red">
        <b>Depósito 3×</b> tras verificar cuenta
      </span>
      <br />
      <button type="button" className="gp-btn btn-red" data-todo="claim-code">
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
