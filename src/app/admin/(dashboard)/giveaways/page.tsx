import { requirePermission } from '@/lib/permissions';
import { getAllGiveaways } from '@/lib/queries/giveaways';
import { getAllTalents } from '@/lib/queries/talents';
import { getAllCodes } from '@/lib/queries/creatorCodes';
import { getAllWinners } from '@/lib/queries/giveawayWinners';
import { listBrandCatalog } from './brand-actions';
import { listCrmBrandsForPicker } from '@/lib/queries/crmBrands';
import { GiveawaysDashboard } from './GiveawaysDashboard';

export default async function AdminGiveawaysPage(): Promise<React.ReactElement> {
  await requirePermission('sorteos', 'read');
  const [allGiveaways, allTalents, allCodes, allWinners, brands, brandCatalog] = await Promise.all([
    getAllGiveaways(),
    getAllTalents(),
    getAllCodes(),
    getAllWinners(),
    listCrmBrandsForPicker(),
    listBrandCatalog(),
  ]);
  return (
    <GiveawaysDashboard
      giveaways={allGiveaways}
      talents={allTalents}
      codes={allCodes}
      winners={allWinners}
      brands={brands}
      brandCatalog={brandCatalog}
    />
  );
}
