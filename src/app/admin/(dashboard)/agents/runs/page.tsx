import { z } from 'zod';

import { AdminPageHeader } from '@/features/admin/_shared/components/AdminPageHeader';
import { RunsTable } from '@/features/admin/agents/components/RunsTable';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { listAgentRunsForAdmin } from '@/lib/queries/agents/admin';

export const metadata = { title: 'Ejecuciones | Agentes' };

/**
 * Los searchParams vienen del cliente, así que pasan por Zod como cualquier
 * otro input externo. Un filtro inválido se ignora en vez de romper la página.
 */
const filtrosSchema = z.object({
  agentId: z.coerce.number().int().positive().optional(),
  status: z
    .enum([
      'queued',
      'running',
      'waiting_approval',
      'retry_scheduled',
      'succeeded',
      'failed',
      'cancelled',
      'budget_blocked',
      'dead_letter',
    ])
    .optional(),
});

export default async function AgentRunsPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
  const sesion = await requirePermission('agents', 'read');
  const canManage = hasPermission(sesion.user.role, 'agents', 'manage');

  const parsed = filtrosSchema.safeParse(await searchParams);
  const filtros = parsed.success ? parsed.data : {};

  const runs = await listAgentRunsForAdmin(filtros);

  const desconocidas = runs.filter((r) => r.outcomeUnknown).length;
  const atascadas = runs.filter((r) => r.stuck).length;

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Ejecuciones"
        subtitle="Historial de runs, con su desenlace y sus intentos"
        stats={[
          { label: 'listadas', value: runs.length },
          // Los dos que piden que alguien haga algo, arriba y con color.
          ...(desconocidas > 0
            ? [{ label: 'desenlace desconocido', value: desconocidas, accent: '#ef4444' }]
            : [{ label: 'desenlace desconocido', value: desconocidas }]),
          ...(atascadas > 0 ? [{ label: 'atascadas', value: atascadas, accent: '#ef4444' }] : [{ label: 'atascadas', value: atascadas }]),
        ]}
        actions={[{ label: 'Agentes', href: '/admin/agents' }]}
      />

      <RunsTable runs={runs} canManage={canManage} />
    </div>
  );
}
