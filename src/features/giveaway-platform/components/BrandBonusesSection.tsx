import { BrandCardKeyDrop } from './BrandCardKeyDrop';
import { BrandCardCsgoskins } from './BrandCardCsgoskins';
import { BrandCardSkinsMonkey } from './BrandCardSkinsMonkey';
import { BrandCardSkinClub } from './BrandCardSkinClub';
import { PartnerConsentGate } from './PartnerConsentGate';
import { getCreatorDeals } from '../constants/creator-deals';
import { PLATFORM_BRANDS, type BrandKey } from '../constants/brands';

interface Props {
  creatorSlug: string;
  creatorCode: string;
  /** True si el usuario tiene sesión activa (typicamente Steam OpenID). */
  readonly isLoggedIn: boolean;
  /**
   * True si el usuario ha aceptado explícitamente el consent de partners
   * externos (+18 + participación responsable). Se lee server-side desde
   * la cookie `sp_partner_consent` en `PlatformCreatorLanding`.
   *
   * Falso → renderizamos `PartnerConsentGate` en lugar de las cards.
   *
   * Ver docs/legal-risk-matrix.md y src/lib/partner-consent.ts.
   */
  readonly partnerConsentGranted: boolean;
}

const LABELS_BY_BRAND: Readonly<Record<BrandKey, string>> = {
  keydrop:     PLATFORM_BRANDS.keydrop.displayName,
  csgoskins:   PLATFORM_BRANDS.csgoskins.displayName,
  skinsmonkey: PLATFORM_BRANDS.skinsmonkey.displayName,
  skinclub:    PLATFORM_BRANDS.skinclub.displayName,
};

/**
 * Bloque de bonuses adaptativo a los deals reales del creador.
 *
 * Reglas:
 *   - 0 deals → placeholder honesto ("Deals de partners próximamente").
 *   - deals > 0 y consent NO otorgado → `PartnerConsentGate` (login +
 *     modal +18/responsable).
 *   - deals > 0 y consent otorgado → cards del partner con toda su info.
 *
 * El consent gate es un requisito legal (Fase 0): la comunicación
 * comercial de partners externos solo se muestra tras confirmación
 * explícita del usuario. Ver docs/legal-risk-matrix.md.
 */
export function BrandBonusesSection({
  creatorSlug,
  creatorCode,
  isLoggedIn,
  partnerConsentGranted,
}: Props) {
  const deals = getCreatorDeals(creatorSlug);

  if (deals.length === 0) {
    return (
      <section aria-label="Deals de partners" className="gp-bonuses-empty">
        <div className="gp-bonuses-empty-inner" role="note">
          <span className="gp-bonuses-empty-icon" aria-hidden>🤝</span>
          <div className="gp-bonuses-empty-body">
            <b>Deals de partners próximamente.</b>
            <span>
              Este creador aún no tiene partnerships confirmados en la
              plataforma. Vuelve pronto — anunciaremos aquí cada nuevo deal.
            </span>
          </div>
        </div>
      </section>
    );
  }

  if (!partnerConsentGranted) {
    return (
      <PartnerConsentGate
        isLoggedIn={isLoggedIn}
        partnerLabels={deals.map((d) => LABELS_BY_BRAND[d])}
      />
    );
  }

  // KeyDrop es siempre la card grande arriba; el resto va en la fila.
  const hasKeyDrop = deals.includes('keydrop');
  const otherDeals = deals.filter((d) => d !== 'keydrop');

  return (
    <>
      {hasKeyDrop ? <BrandCardKeyDrop code={creatorCode} /> : null}

      {otherDeals.length > 0 ? (
        <section aria-label="Deals de partners">
          <div className={otherDeals.length === 1 ? 'gp-grid-1' : 'gp-grid-2'}>
            {otherDeals.map((brand) => renderBrandCard(brand, creatorCode))}
          </div>
        </section>
      ) : null}
    </>
  );
}

function renderBrandCard(brand: BrandKey, code: string) {
  switch (brand) {
    case 'keydrop':
      // KeyDrop se renderiza aparte arriba — no debería llegar aquí.
      return <BrandCardKeyDrop key={brand} code={code} />;
    case 'csgoskins':
      return <BrandCardCsgoskins key={brand} code={code} />;
    case 'skinsmonkey':
      return <BrandCardSkinsMonkey key={brand} code={code} />;
    case 'skinclub':
      return <BrandCardSkinClub key={brand} code={code} />;
  }
}
