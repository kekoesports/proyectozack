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
          <div className="gp-wordmark wm-gamdom">
            <div className="gp-wm-ico" aria-hidden>♜</div>
            <div className="gp-wm-txt" id="brand-gamdom">Gamdom</div>
          </div>
          <div className="gp-logo-note">↳ {brand.logoAsset}</div>
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
      </div>
    </section>
  );
}
