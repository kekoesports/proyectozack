import { AdminPageHeader } from '@/features/admin/_shared/components/AdminPageHeader';
import { CreatorApplicationsTable } from '@/features/admin/creator-applications/components/CreatorApplicationsTable';
import { requirePermission } from '@/lib/permissions';
import { listCreatorApplicationReviews } from '@/lib/queries/creatorApplicationReviews';

export const metadata = { title: 'Candidaturas | Admin' };

export default async function CreatorApplicationsPage(): Promise<React.ReactElement> {
  await requirePermission('leads', 'read');
  const items = await listCreatorApplicationReviews();
  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Candidaturas"
        subtitle="Revisión de perfiles recibidos desde la web"
        stats={[
          { label: 'total', value: items.length },
          { label: 'viables', value: items.filter((item) => item.reviewDecision === 'green').length, accent: '#10b981' },
          { label: 'revisar', value: items.filter((item) => item.reviewDecision === 'yellow').length, accent: '#f59e0b' },
          { label: 'no encajan', value: items.filter((item) => item.reviewDecision === 'red').length, accent: '#ef4444' },
        ]}
      />
      <CreatorApplicationsTable items={items.map((item) => ({
        sourceType: item.sourceType,
        sourceId: item.sourceId,
        createdAt: item.createdAt.toISOString(),
        name: item.name,
        email: item.email,
        platform: item.platform,
        handle: item.handle,
        contentCategory: item.contentCategory,
        followers: item.followers,
        averageAudience: item.averageAudience,
        outreachStatus: item.outreachStatus,
        reviewDecision: item.reviewDecision,
      }))} />
    </div>
  );
}
