import { notFound } from 'next/navigation';

import { CreatorApplicationDetail } from '@/features/admin/creator-applications/components/CreatorApplicationDetail';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { getCreatorApplicationReview } from '@/lib/queries/creatorApplicationReviews';
import { getCreatorOutreachForSource } from '@/lib/queries/creatorOutreach';
import { creatorReviewSourceTypeSchema } from '@/lib/schemas/creator-outreach';

export const metadata = { title: 'Candidatura | Admin' };

type Props = { readonly params: Promise<{ sourceType: string; id: string }> };

export default async function CreatorApplicationDetailPage({ params }: Props): Promise<React.ReactElement> {
  const session = await requirePermission('leads', 'read');
  const raw = await params;
  const sourceType = creatorReviewSourceTypeSchema.safeParse(raw.sourceType);
  const sourceId = Number(raw.id);
  if (!sourceType.success || !Number.isInteger(sourceId) || sourceId <= 0) notFound();

  const [item, outreach] = await Promise.all([
    getCreatorApplicationReview(sourceType.data, sourceId),
    getCreatorOutreachForSource(sourceType.data, sourceId),
  ]);
  if (!item) notFound();
  return <CreatorApplicationDetail item={item} outreach={outreach} canWrite={hasPermission(session.user.role, 'leads', 'write')} />;
}
