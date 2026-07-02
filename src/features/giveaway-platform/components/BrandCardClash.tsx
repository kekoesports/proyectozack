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
        <div className="gp-wordmark wm-clash">
          <div className="gp-wm-ico" aria-hidden><span>◆</span></div>
          <div className="gp-wm-txt">
            CLASH<i>.GG</i>
          </div>
        </div>
        <div className="gp-logo-note">↳ {brand.logoAsset}</div>
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
      <div className="agent-wrap" aria-hidden>
        <div className="gp-agent v2">
          <div className="head" data-tag="" />
          <div className="torso" />
          <div className="arms" />
          <div className="vest" />
        </div>
      </div>
    </div>
  );
}
