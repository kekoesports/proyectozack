import { PLATFORM_BRANDS } from '../constants/brands';

interface Props {
  code: string;
}

export function BrandCardSkinClub({ code }: Props) {
  const brand = PLATFORM_BRANDS.skinclub;
  return (
    <section aria-labelledby="brand-skinclub">
      <div className="gp-card p-skinclub">
        <div className="glow" aria-hidden />
        <div className="ufo" aria-hidden>🛸</div>
        <div className="gp-logo-slot">
          <div className="gp-wordmark wm-skinclub">
            <div className="gp-wm-ico" aria-hidden>◈</div>
            <div className="gp-wm-txt" id="brand-skinclub">Skin.Club</div>
          </div>
          <div className="gp-logo-note">↳ {brand.logoAsset}</div>
        </div>
        <p className="claim" style={{ fontSize: 19, marginTop: 14 }}>
          <span className="hl-orange">Bono 7%</span> + Tickets para el sorteo de{' '}
          <span className="hl-orange">10 skins</span> mensuales
        </p>
        <p className="gp-resp">{brand.disclaimer}</p>
        <div className="info-strip" role="note">
          ⓘ Cada código se activa una vez y tiene su número de usos. Si cambias de código, perderás los usos restantes
        </div>
        <div className="code-row">
          <button type="button" className="gp-btn btn-code full" data-todo="claim-code">
            Código Especial <span className="meta">· 12 usos</span>
          </button>
          <button type="button" className="gp-btn btn-code" data-todo="claim-code">
            Código: <span>{code}</span> <span className="meta"><b>7% bonus</b> · 25 usos</span>
          </button>
          <button type="button" className="gp-btn btn-code" data-todo="claim-code">
            Código: <span>{code}CS</span> <span className="meta"><b>7% bonus</b> · 25 usos</span>
          </button>
        </div>
        <div className="agent-wrap" aria-hidden>
          <div className="gp-agent v3">
            <div className="head" data-tag="SP" />
            <div className="torso" />
            <div className="arms" />
            <div className="vest" />
          </div>
          <div className="gp-agent-slot">↳ {brand.agentAsset}</div>
        </div>
      </div>
    </section>
  );
}
