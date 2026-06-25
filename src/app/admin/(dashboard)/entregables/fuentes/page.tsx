import { requirePermission } from '@/lib/permissions';
import { listSheetSources } from '@/lib/queries/brand-sheet-sources';
import { listCrmBrandsForPicker } from '@/lib/queries/crmBrands';
import { BrandSheetSourcesClient } from '@/features/admin/trackers/components/BrandSheetSourcesClient';

export const dynamic = 'force-dynamic';

export default async function BrandSheetSourcesPage() {
  await requirePermission('campanas', 'read');

  const [sources, brands] = await Promise.all([
    listSheetSources(),
    listCrmBrandsForPicker(),
  ]);

  const brandList = brands.map((b) => ({ id: b.id, name: b.name }));

  return <BrandSheetSourcesClient sources={sources} brands={brandList} />;
}
