import Image from 'next/image';
import { PLATFORM_BRANDS } from '../constants/brands';
import { buildKeydropClaimUrl } from '@/lib/external-giveaways/providers/keydrop/mapper';
import { PartnerExternalNotice } from '@/components/partner/PartnerExternalNotice';

interface Props {
  code: string;
}

// @allow-sensitive-copy: card de partner externo (KeyDrop). Todo el copy comercial ("200% Bonus",
// "12x wagering", "raffles $") es información objetiva del partner — SocialPro no la origina. El
// renderizado de este componente está detrás de un consent gate en `BrandBonusesSection`: solo se
// muestra a usuarios logueados que hayan aceptado +18 y participación responsable. Ver
// docs/legal-risk-matrix.md y docs/external-partners.md.

/**
 * Card grande de KeyDrop en el hero de bonuses del creador.
 *
 * Los tres CTAs (Reclamar, 200% Bonus, Cómo participar) van al mismo
 * deep-link con el código del creador aplicado: `kd.link/?code=X`. Es la
 * URL oficial del shortener afiliado que registra el trackeo del partner.
 * Ver `buildKeydropClaimUrl` y `docs/keydrop-api-capabilities.md`.
 *
 * `PartnerExternalNotice` es obligatorio: informa al usuario de que la
 * operativa es de KeyDrop y no de SocialPro.
 */
export function BrandCardKeyDrop({ code }: Props) {
  const brand = PLATFORM_BRANDS.keydrop;
  const claimUrl = buildKeydropClaimUrl(code);
  return (
    <section aria-labelledby="brand-keydrop">
      <PartnerExternalNotice partner="KeyDrop" category="casino_like" />
      <div className="gp-card gp-card-led p-keydrop">
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
            <a
              className="gp-btn btn-reclamar-blue gp-cta-link"
              href={claimUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-cta="keydrop-claim"
            >
              Reclamar
            </a>
            <div className="cs-btn-row">
              <a
                className="bonus-chip gp-cta-link"
                href={claimUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-cta="keydrop-bonus"
              >
                <b>200% Bonus</b>
                <span>12x wagering · 7 días para completar</span>
              </a>
              <a
                className="chip-ghost gp-cta-link"
                href={claimUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-cta="keydrop-how"
              >
                ❓ Cómo participar
              </a>
            </div>
          </div>
        </div>
        <div className="right" aria-hidden>
          {brand.agentAsset ? (
            <Image
              src={brand.agentAsset}
              alt=""
              width={723}
              height={469}
              className="gp-brand-keydrop-banner"
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
