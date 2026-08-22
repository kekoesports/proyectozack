import Link from 'next/link';

import { requirePermission } from '@/lib/permissions';
import { listTaskSanitationQueue } from '@/lib/queries/task-sanitation';
import { getIsoWeekLabel } from '@/lib/utils/week';
import { TaskSanitationClient } from '@/features/admin/tasks/components/TaskSanitationClient';

export const dynamic = 'force-dynamic';

export default async function TareasSaneamientoPage() {
  const session = await requirePermission('tareas', 'read');
  const weekLabel = getIsoWeekLabel(new Date());
  const todayIso = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const staffSession = session.user.role === 'staff'
    ? { userId: session.user.id, role: session.user.role }
    : undefined;

  const rows = await listTaskSanitationQueue({
    weekLabel,
    todayIso,
    ...(staffSession ? { session: staffSession } : {}),
  });

  return (
    <div className="space-y-5">
      <Link
        href="/admin/tareas"
        className="inline-flex items-center gap-1.5 text-sm text-sp-muted hover:text-sp-dark transition-colors"
      >
        ← Tareas
      </Link>
      <TaskSanitationClient rows={rows} todayIso={todayIso} />
    </div>
  );
}
