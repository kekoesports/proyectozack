import { requirePermission } from '@/lib/permissions';
import { getTrackerWithItems } from '@/lib/queries/deal-trackers';
import { TrackerDetailClient } from '@/features/admin/trackers/components/TrackerDetailClient';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ trackerId: string }> };

export default async function TrackerDetailPage({ params }: PageProps) {
  const session = await requirePermission('campanas', 'read');

  const { trackerId } = await params;
  const id = Number(trackerId);
  if (!id || isNaN(id)) notFound();

  const tracker = await getTrackerWithItems(
    id,
    session.user.role === 'staff'
      ? { userId: session.user.id, role: session.user.role }
      : undefined,
  );
  if (!tracker) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/admin/entregables"
        className="inline-flex items-center gap-1.5 text-sm text-sp-muted hover:text-sp-dark transition-colors"
      >
        ← Todos los trackers
      </Link>
      <TrackerDetailClient tracker={tracker} />
    </div>
  );
}
