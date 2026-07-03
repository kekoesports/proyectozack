import Image from 'next/image';
import { PLATFORM_BRANDS } from '../constants/brands';

interface Props {
  code: string;
}

export function BrandCardSkinClub({ code }: Props) {
  const brand = PLATFORM_BRANDS.skinclub;
  return (
    <section aria-labelledby="brand-skinclub">
      <div className="gp-card gp-card-led p-skinclub">
        <div className="glow" aria-hidden />
        <div className="ufo" aria-hidden>🛸</div>
        <div className="gp-logo-slot">
          {brand.logoAsset ? (
            <Image
              src={brand.logoAsset}
              alt={brand.displayName}
              width={200}
              height={48}
              className="gp-brand-logo"
              id="brand-skinclub"
            />
          ) : (
            <div className="gp-brand-logo-fallback" id="brand-skinclub">{brand.displayName}</div>
          )}
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
        {brand.agentAsset ? (
          <div className="gp-brand-agent-wrap gp-brand-agent-wrap-lg" aria-hidden>
            <Image
              src={brand.agentAsset}
              alt=""
              width={280}
              height={360}
              className="gp-brand-agent"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
