import { Suspense, type ReactElement } from 'react';
import { AdminPageHeader } from '@/features/admin/_shared/components/AdminPageHeader';
import type { Metadata } from 'next';
import { requirePermission } from '@/lib/permissions';
import {
  getTasksForWeek,
  getTasksForCalendarView,
  getTaskTemplates,
  getUsedCategories,
  getTaskRelatedOptions,
  resolveRelatedLabels,
  rollOverPendingTasks,
} from '@/lib/queries/crmTasks';
import { getEventsForMonth } from '@/lib/queries/crmEvents';
import { getAllStaffUsers } from '@/lib/queries/staffUsers';
import { getIsoWeekLabel } from '@/lib/utils/week';
import { TaskWorkspace } from '@/features/admin/tasks/components/TaskWorkspace';

export const metadata: Metadata = { title: 'Tareas | Admin' };

export default async function TareasPage(): Promise<ReactElement> {
  const session = await requirePermission('tareas', 'read');
  const weekLabel  = getIsoWeekLabel(new Date());
  const prevDate   = new Date(); prevDate.setDate(prevDate.getDate() - 7);
  const prevWeek   = getIsoWeekLabel(prevDate);

  // Auto-rollover silencioso — idempotente: no hace nada si ya se arrastró
  await rollOverPendingTasks(prevWeek, weekLabel);

  const taskOptions = session.user.role !== 'admin'
    ? { session: { userId: session.user.id, role: session.user.role } }
    : {};

  const calendarOptions = session.user.role !== 'admin'
    ? { session: { userId: session.user.id, role: session.user.role } }
    : undefined;

  const now = new Date();
  const [tasks, calendarTasks, users, suggestedCategories, relatedOptions, templates, events] = await Promise.all([
    getTasksForWeek(weekLabel, taskOptions),
    getTasksForCalendarView(weekLabel, calendarOptions),
    getAllStaffUsers(),
    getUsedCategories(),
    getTaskRelatedOptions(),
    getTaskTemplates(),
    getEventsForMonth(now.getFullYear(), now.getMonth() + 1, { userId: session.user.id, role: session.user.role }),
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
          calendarTasks={calendarTasks}
          events={events}
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
