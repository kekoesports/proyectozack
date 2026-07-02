import Image from 'next/image';
import { PLATFORM_BRANDS } from '../constants/brands';

interface Props {
  creatorName: string;
}

export function BrandCardGamdom({ creatorName }: Props) {
  const brand = PLATFORM_BRANDS.gamdom;
  return (
    <section aria-labelledby="brand-gamdom">
      <div className="gp-card p-gamdom">
        <div className="glow" aria-hidden />
        <div className="gp-logo-slot">
          {brand.logoAsset ? (
            <Image
              src={brand.logoAsset}
              alt={brand.displayName}
              width={200}
              height={48}
              className="gp-brand-logo"
              id="brand-gamdom"
            />
          ) : (
            <div className="gp-brand-logo-fallback" id="brand-gamdom">
              {brand.displayName}
            </div>
          )}
        </div>
        <p className="claim" style={{ marginTop: 14 }}>
          Regístrate en <span className="hl-orange">Gamdom</span> desde este enlace y consigue{' '}
          <span className="hl-orange">batallas gratuitas y premios en la leaderboard</span>
        </p>
        <p className="gp-resp">{brand.disclaimer}</p>
        <div className="info-strip green" role="note">
          ⓘ En Gamdom no hay códigos de referido: con registrarte desde este botón quedarás referido a{' '}
          <b>&nbsp;{creatorName}&nbsp;</b> automáticamente.
        </div>
        <button type="button" className="gp-btn btn-green-wide" data-todo="claim-code">
          Reclamar
        </button>
        {/* Hueco preparado para agente futuro. Sin divs falsos: si mañana */}
        {/* llega asset a `brand.agentAsset`, aparece automáticamente. */}
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
    </section>
  );
}
