import { notFound } from 'next/navigation';
import { z } from 'zod';

import { AdminPageHeader } from '@/features/admin/_shared/components/AdminPageHeader';
import { RunTimeline } from '@/features/admin/agents/components/RunTimeline';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { getAgentRunDetail } from '@/lib/queries/agents/admin';

export const metadata = { title: 'Ejecución | Agentes' };

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

export default async function AgentRunDetailPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const sesion = await requirePermission('agents', 'read');
  const canWrite = hasPermission(sesion.user.role, 'agents', 'write');

  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) notFound();

  const detalle = await getAgentRunDetail(parsed.data.id);
  if (!detalle) notFound();

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={`Ejecución #${detalle.run.id}`}
        subtitle={`${detalle.run.agentName} · ${detalle.run.triggerType}`}
        actions={[{ label: 'Volver', href: '/admin/agents/runs' }]}
      />

      <RunTimeline detail={detalle} canWrite={canWrite} />
    </div>
  );
}
