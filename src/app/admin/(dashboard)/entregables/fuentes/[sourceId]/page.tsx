import { requirePermission } from '@/lib/permissions';
import { getSheetSourceWithTrackers } from '@/lib/queries/brand-sheet-sources';
import { BrandSheetSourceDetailClient } from '@/features/admin/trackers/components/BrandSheetSourceDetailClient';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ sourceId: string }> };

export default async function BrandSheetSourceDetailPage({ params }: PageProps) {
  await requirePermission('campanas', 'read');

  const { sourceId } = await params;
  const id = Number(sourceId);
  if (!id || isNaN(id)) notFound();

  const source = await getSheetSourceWithTrackers(id);
  if (!source) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/admin/entregables/fuentes"
        className="inline-flex items-center gap-1.5 text-sm text-sp-muted hover:text-sp-dark transition-colors"
      >
        ← Todas las fuentes
      </Link>
      <BrandSheetSourceDetailClient source={source} />
    </div>
  );
}
