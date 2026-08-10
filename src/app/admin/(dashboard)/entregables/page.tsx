import { requirePermission } from '@/lib/permissions';
import { listTrackers, getTrackerSubtypeCounts } from '@/lib/queries/deal-trackers';
import { listCrmBrands } from '@/lib/queries/crmBrands';
import { getAllTalents, listVisibleTalentIds } from '@/lib/queries/talents';
import { TrackersListClient } from '@/features/admin/trackers/components/TrackersListClient';

export const dynamic = 'force-dynamic';

export default async function EntregablesPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ q?: string }>;
}) {
  const session = await requirePermission('campanas', 'read');

  const sp = await searchParams;
  const search = sp.q?.trim() || undefined;
  const isStaff = session.user.role === 'staff';
  const staffSession = isStaff
    ? { userId: session.user.id, role: session.user.role }
    : undefined;

  const [trackers, brands, allTalents, visibleTalentIds] = await Promise.all([
    listTrackers({
      ...(search ? { search } : {}),
      ...(staffSession ? { session: staffSession } : {}),
    }),
    listCrmBrands(
      isStaff
        ? { userId: session.user.id, role: session.user.role }
        : undefined,
    ),
    getAllTalents(),
    listVisibleTalentIds({ userId: session.user.id, role: session.user.role }),
  ]);

  const trackerIds = trackers.map((t) => t.id);
  const subtypeCounts = await getTrackerSubtypeCounts(trackerIds);

  const allowTalents = visibleTalentIds ? new Set(visibleTalentIds) : null;
  const talents = allTalents
    .filter((t) => !allowTalents || allowTalents.has(t.id))
    .map((t: { id: number; name: string }) => ({ id: t.id, name: t.name }));
  const brandList = brands.map((b: { id: number; name: string }) => ({ id: b.id, name: b.name }));

  return (
    <TrackersListClient
      trackers={trackers}
      brands={brandList}
      talents={talents}
      subtypeCounts={subtypeCounts}
      initialSearch={search ?? ''}
    />
  );
}
