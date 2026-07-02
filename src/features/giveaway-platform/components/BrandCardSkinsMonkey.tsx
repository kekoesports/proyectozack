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
        <div className="gp-wordmark wm-monkey">
          <div className="gp-wm-ico" aria-hidden>🐵</div>
          <div className="gp-wm-txt">SkinsMonkey</div>
        </div>
        <div className="gp-logo-note">↳ {brand.logoAsset}</div>
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
