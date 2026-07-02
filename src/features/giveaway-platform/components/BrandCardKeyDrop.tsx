import Image from 'next/image';
import { PLATFORM_BRANDS } from '../constants/brands';

interface Props {
  code: string;
}

export function BrandCardKeyDrop({ code }: Props) {
  const brand = PLATFORM_BRANDS.keydrop;
  return (
    <section aria-labelledby="brand-keydrop">
      <div className="gp-card p-keydrop">
        <div className="pad">
          <div className="gp-logo-slot">
            {brand.logoAsset ? (
              <Image
                src={brand.logoAsset}
                alt={brand.displayName}
                width={220}
                height={54}
                className="gp-brand-logo"
                priority
                id="brand-keydrop"
              />
            ) : (
              <div className="gp-brand-logo-fallback" id="brand-keydrop">{brand.displayName}</div>
            )}
          </div>
          <p className="claim">
            Usa el código <span className="hl-gold">{code}</span> para conseguir{' '}
            <span className="hl-gold">puntos</span>, participar en las leaderboards de{' '}
            <span className="hl-cyan">5000$</span> cada <span className="hl-cyan">15</span> días y en
            raffles de <span className="hl-cyan">3000$</span> en <span className="hl-gold">skins</span>
          </p>
          <p className="gp-resp">{brand.disclaimer}</p>
          <div style={{ marginTop: 20 }}>
            <button type="button" className="gp-btn btn-reclamar-blue" data-todo="claim-code">
              Reclamar
            </button>
            <div className="cs-btn-row">
              <div className="bonus-chip" role="presentation">
                <b>200% Bonus</b>
                <span>12x wagering · 7 días para completar</span>
              </div>
              <div className="chip-ghost" role="presentation">
                ❓ Cómo participar
              </div>
            </div>
          </div>
        </div>
        <div className="right" aria-hidden>
          <span className="money" style={{ left: '10%', animationDelay: '0s' }}>💵</span>
          <span className="money" style={{ left: '32%', animationDelay: '1.4s' }}>💵</span>
          <span className="money" style={{ left: '64%', animationDelay: '2.6s' }}>💵</span>
          <span className="money" style={{ left: '84%', animationDelay: '.8s' }}>💵</span>
          {brand.agentAsset ? (
            <Image
              src={brand.agentAsset}
              alt=""
              width={260}
              height={340}
              className="gp-brand-agent gp-brand-agent-keydrop"
            />
          ) : null}
          <div className="vip-club">
            <div className="t">VIP CLUB</div>
            <button type="button" className="gp-btn btn-vip" data-todo="vip-club">
              👑 Únete al Club VIP
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
