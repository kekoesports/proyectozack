import Link from 'next/link';

import { requirePermission } from '@/lib/permissions';
import { getTrackerReconciliationPreflight } from '@/lib/queries/tracker-reconciliation-preflight';
import { listReconciliationQueue } from '@/lib/queries/tracker-reconciliation';
import { trackerReconciliationQueueFilterSchema } from '@/lib/schemas/tracker-reconciliation';
import { TrackerReconciliationClient } from '@/features/admin/trackers/components/TrackerReconciliationClient';

export const dynamic = 'force-dynamic';

export default async function EntregablesReconciliarPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ estado?: string }>;
}) {
  const session = await requirePermission('campanas', 'read');
  const sp = await searchParams;
  const parsedFilter = trackerReconciliationQueueFilterSchema.safeParse(sp.estado);
  const filter = parsedFilter.success ? parsedFilter.data : 'unreconciled';

  const staffSession = session.user.role === 'staff'
    ? { userId: session.user.id, role: session.user.role }
    : undefined;

  const [preflight, rows] = await Promise.all([
    getTrackerReconciliationPreflight(),
    listReconciliationQueue({
      filter,
      ...(staffSession ? { session: staffSession } : {}),
    }),
  ]);

  return (
    <div className="space-y-5">
      <Link
        href="/admin/entregables"
        className="inline-flex items-center gap-1.5 text-sm text-sp-muted hover:text-sp-dark transition-colors"
      >
        ← Entregables
      </Link>
      <TrackerReconciliationClient
        filter={filter}
        preflight={preflight}
        rows={rows}
      />
    </div>
  );
}
