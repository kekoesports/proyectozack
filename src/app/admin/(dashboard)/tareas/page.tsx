import { Suspense, type ReactElement } from 'react';
import { AdminPageHeader } from '@/features/admin/_shared/components/AdminPageHeader';
import type { Metadata } from 'next';
import { requireAnyRole } from '@/lib/auth-guard';
import {
  getTasksForWeek,
  getTaskTemplates,
  getUsedCategories,
  getTaskRelatedOptions,
  resolveRelatedLabels,
  rollOverPendingTasks,
} from '@/lib/queries/crmTasks';
import { getAllStaffUsers } from '@/lib/queries/staffUsers';
import { getIsoWeekLabel } from '@/lib/utils/week';
import { TaskWorkspace } from '@/features/admin/tasks/components/TaskWorkspace';

export const metadata: Metadata = { title: 'Tareas | Admin' };

export default async function TareasPage(): Promise<ReactElement> {
  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');
  const weekLabel = getIsoWeekLabel(new Date());
  const prevDate   = new Date(); prevDate.setDate(prevDate.getDate() - 7);
  const prevWeek   = getIsoWeekLabel(prevDate);

  // Auto-rollover silencioso — idempotente: no hace nada si ya se arrastró
  await rollOverPendingTasks(prevWeek, weekLabel);

  const [tasks, users, suggestedCategories, relatedOptions, templates] = await Promise.all([
    getTasksForWeek(weekLabel, {
      session: {
        userId: session.user.id,
        role: session.user.role as 'admin' | 'manager' | 'staff',
      },
    }),
    getAllStaffUsers(),
    getUsedCategories(),
    getTaskRelatedOptions(),
    getTaskTemplates(),
  ]);

  const relatedLabels = await resolveRelatedLabels(tasks);

  const userOptions: readonly { readonly id: string; readonly name: string }[] = users.map((u) => ({
    id: u.id,
    name: u.name,
  }));

  const pendingCount = tasks.filter((t) => t.status !== 'completada').length;
  const doneCount = tasks.filter((t) => t.status === 'completada').length;

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Tareas"
        subtitle={weekLabel}
        stats={[
          { label: 'pendientes', value: pendingCount, accent: '#f5632a' },
          { label: 'completadas', value: doneCount, accent: '#16a34a' },
          { label: 'total', value: tasks.length },
        ]}
      />

      <Suspense fallback={<p className="text-sm text-sp-admin-muted">Cargando tareas…</p>}>
        <TaskWorkspace
          tasks={tasks}
          users={userOptions}
          currentUserId={session.user.id}
          suggestedCategories={suggestedCategories}
          weekLabel={weekLabel}
          relatedOptions={relatedOptions}
          relatedLabels={relatedLabels}
          templates={templates}
        />
      </Suspense>
    </div>
  );
}
