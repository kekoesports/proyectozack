import { BrandCardKeyDrop } from './BrandCardKeyDrop';
import { BrandCardCsgoskins } from './BrandCardCsgoskins';
import { BrandCardSkinsMonkey } from './BrandCardSkinsMonkey';
import { BrandCardSkinClub } from './BrandCardSkinClub';
import { getCreatorDeals } from '../constants/creator-deals';
import type { BrandKey } from '../constants/brands';

interface Props {
  creatorSlug: string;
  creatorCode: string;
}

/**
 * Bloque de bonuses adaptativo a los deals reales del creador.
 *
 * Reglas:
 *   - 0 deals → placeholder honesto ("Deals de partners próximamente").
 *   - 1 deal  → card sola full-width (no grid).
 *   - 2 deals → grid 2 columnas (`.gp-grid-2`), sin dejar hueco.
 *   - 3+ deals → misma grid + siguientes cards apiladas.
 *
 * Las cards que renderiza SIEMPRE están en `CREATOR_DEALS` para el
 * creador activo — nunca aparecen partners fantasma. La lista canónica
 * de partnerships vive en `creator-deals.ts`.
 */
export function BrandBonusesSection({ creatorSlug, creatorCode }: Props) {
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
