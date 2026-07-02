import { BrandCardCSDrop } from './BrandCardCSDrop';
import { BrandCardClash } from './BrandCardClash';
import { BrandCardSkinsMonkey } from './BrandCardSkinsMonkey';
import { BrandCardSkinClub } from './BrandCardSkinClub';
import { BrandCardGamdom } from './BrandCardGamdom';

interface Props {
  creatorCode: string;
  creatorName: string;
}

/**
 * Bloque estático de bonuses de partners.
 * Datos en src/features/giveaway-platform/constants/brands.ts (PR1 estático).
 */
export function BrandBonusesSection({ creatorCode, creatorName }: Props) {
  return (
    <>
      <BrandCardCSDrop code={creatorCode} />

      <section aria-label="Clash.gg y SkinsMonkey">
        <div className="gp-grid-2">
          <BrandCardClash code={creatorCode} />
          <BrandCardSkinsMonkey code={creatorCode} />
        </div>
      </section>

      <BrandCardSkinClub code={creatorCode} />
      <BrandCardGamdom creatorName={creatorName} />
    </>
  );
}
