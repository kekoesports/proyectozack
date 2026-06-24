import { requirePermission } from '@/lib/permissions';
import { listTrackers } from '@/lib/queries/deal-trackers';
import { listCrmBrands } from '@/lib/queries/crmBrands';
import { getAllTalents } from '@/lib/queries/talents';
import { TrackersListClient } from '@/features/admin/trackers/components/TrackersListClient';

export const dynamic = 'force-dynamic';

export default async function EntregablesPage() {
  await requirePermission('campanas', 'read');

  const [trackers, brands, allTalents] = await Promise.all([
    listTrackers(),
    listCrmBrands(),
    getAllTalents(),
  ]);

  const talents = allTalents.map((t: { id: number; name: string }) => ({ id: t.id, name: t.name }));
  const brandList = brands.map((b: { id: number; name: string }) => ({ id: b.id, name: b.name }));

  return (
    <TrackersListClient
      trackers={trackers}
      brands={brandList}
      talents={talents}
    />
  );
}
