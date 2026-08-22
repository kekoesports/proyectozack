import { AdminPageHeader } from '@/features/admin/_shared/components/AdminPageHeader';
import { AgentsCatalogue } from '@/features/admin/agents/components/AgentsCatalogue';
import { areAgentsEnabled } from '@/lib/agents/runtime-flags';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { listAgentsWithActivity } from '@/lib/queries/agents/admin';

export const metadata = { title: 'Agentes | Admin' };

/**
 * Catálogo de agentes.
 *
 * Server Component: lee y pasa los datos ya calculados. `canManage` decide qué
 * botones se pintan, pero cada Server Action vuelve a comprobar el permiso — la
 * UI no autoriza nada.
 */
export default async function AgentsPage(): Promise<React.ReactElement> {
  const sesion = await requirePermission('agents', 'read');
  const canManage = hasPermission(sesion.user.role, 'agents', 'manage');

  const agentes = await listAgentsWithActivity();
  const activos = agentes.filter((a) => a.status === 'active').length;
  const firmas = agentes.reduce((suma, a) => suma + a.pendingApprovals, 0);

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Agentes"
        subtitle="Catálogo, estado y autonomía de Zack Agent OS"
        stats={[
          { label: 'agentes', value: agentes.length },
          ...(activos > 0 ? [{ label: 'activos', value: activos, accent: '#10b981' }] : [{ label: 'activos', value: activos }]),
          ...(firmas > 0 ? [{ label: 'firmas pendientes', value: firmas, accent: '#5b9bd5' }] : [{ label: 'firmas pendientes', value: firmas }]),
        ]}
        actions={[
          { label: 'Ejecuciones', href: '/admin/agents/runs' },
          { label: 'Aprobaciones', href: '/admin/agents/approvals', primary: firmas > 0 },
        ]}
      />

      <AgentsCatalogue
        agents={agentes}
        canManage={canManage}
        globalKillSwitchOn={areAgentsEnabled()}
      />
    </div>
  );
}
