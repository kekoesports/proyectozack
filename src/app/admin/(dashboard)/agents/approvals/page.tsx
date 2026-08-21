import { AdminPageHeader } from '@/features/admin/_shared/components/AdminPageHeader';
import { ApprovalsQueue } from '@/features/admin/agents/components/ApprovalsQueue';
import { requirePermission } from '@/lib/permissions';
import { listPendingApprovalsForAdmin } from '@/lib/queries/agents/admin';

export const metadata = { title: 'Aprobaciones | Agentes' };

/**
 * Centro de aprobaciones.
 *
 * La página exige `agents:approve`: quien no puede firmar tampoco necesita ver
 * la cola de acciones pendientes con sus argumentos.
 */
export default async function AgentApprovalsPage(): Promise<React.ReactElement> {
  const sesion = await requirePermission('agents', 'approve');
  const ahora = new Date();

  const aprobaciones = await listPendingApprovalsForAdmin();
  const caducan = aprobaciones.filter(
    (a) => a.expiresAt.getTime() - ahora.getTime() < 60 * 60 * 1000,
  ).length;

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Aprobaciones"
        subtitle="Acciones congeladas esperando una firma humana"
        stats={[
          { label: 'pendientes', value: aprobaciones.length },
          ...(caducan > 0 ? [{ label: 'caducan en <1 h', value: caducan, accent: '#f59e0b' }] : [{ label: 'caducan en <1 h', value: caducan }]),
        ]}
        actions={[{ label: 'Agentes', href: '/admin/agents' }]}
      />

      <ApprovalsQueue approvals={aprobaciones} role={sesion.user.role} ahora={ahora} />
    </div>
  );
}
