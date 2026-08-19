import { AdminPageHeader } from '@/features/admin/_shared/components/AdminPageHeader';
import { DraftsTable } from '@/features/admin/automation-drafts/components/DraftsTable';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { listAutomationDealDrafts } from '@/lib/queries/automationDealDrafts';

export const metadata = { title: 'Borradores | Admin' };

export default async function AdminAutomationDraftsPage(): Promise<React.ReactElement> {
  const session = await requirePermission('campanas', 'read');
  const canWrite = hasPermission(session.user.role, 'campanas', 'write');

  // Server-first: se trae el listado completo y el cliente filtra en local.
  const drafts = await listAutomationDealDrafts();

  const porRevisar = drafts.filter((d) => d.status === 'pending_review').length;
  const faltanDatos = drafts.filter((d) => d.status === 'missing_info').length;

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Borradores"
        subtitle="Tratos que entran por automatización y esperan aprobación humana"
        stats={[
          { label: 'total', value: drafts.length },
          { label: 'por revisar', value: porRevisar, accent: '#5b9bd5' },
          { label: 'faltan datos', value: faltanDatos, accent: '#f5632a' },
        ]}
      />
      <DraftsTable drafts={drafts} canWrite={canWrite} />
    </div>
  );
}
