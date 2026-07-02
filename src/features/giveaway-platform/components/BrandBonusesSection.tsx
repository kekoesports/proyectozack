import { BrandCardKeyDrop } from './BrandCardKeyDrop';
import { BrandCardCsgoskins } from './BrandCardCsgoskins';
import { BrandCardSkinsMonkey } from './BrandCardSkinsMonkey';
import { BrandCardSkinClub } from './BrandCardSkinClub';

interface Props {
  creatorCode: string;
}

/**
 * Bloque estático de bonuses de partners.
 * Datos en src/features/giveaway-platform/constants/brands.ts.
 */
export function BrandBonusesSection({ creatorCode }: Props) {
  return (
    <>
      <BrandCardKeyDrop code={creatorCode} />

      <section aria-label="CSGO-SKINS y SkinsMonkey">
        <div className="gp-grid-2">
          <BrandCardCsgoskins code={creatorCode} />
          <BrandCardSkinsMonkey code={creatorCode} />
        </div>
      </section>

      <BrandCardSkinClub code={creatorCode} />
    </>
  );
}
