import { Suspense, type ReactElement } from 'react';
import type { Metadata } from 'next';
import { requireAnyRole } from '@/lib/auth-guard';
import {
  getTasksForWeek,
  getUsedCategories,
  getTaskRelatedOptions,
  resolveRelatedLabels,
} from '@/lib/queries/crmTasks';
import { getAllStaffUsers } from '@/lib/queries/staffUsers';
import { getIsoWeekLabel } from '@/lib/utils/week';
import { TaskWorkspace } from '@/features/admin/tasks/components/TaskWorkspace';

export const metadata: Metadata = { title: 'Tareas | Admin' };

export default async function TareasPage(): Promise<ReactElement> {
  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');
  const weekLabel = getIsoWeekLabel(new Date());

  const [tasks, users, suggestedCategories, relatedOptions] = await Promise.all([
    getTasksForWeek(weekLabel, {
      session: {
        userId: session.user.id,
        role: session.user.role as 'admin' | 'manager' | 'staff',
      },
    }),
    getAllStaffUsers(),
    getUsedCategories(),
    getTaskRelatedOptions(),
  ]);

  const relatedLabels = await resolveRelatedLabels(tasks);

  const userOptions: readonly { readonly id: string; readonly name: string }[] = users.map((u) => ({
    id: u.id,
    name: u.name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-black uppercase text-sp-admin-text">Tareas</h1>
        <p className="text-sm text-sp-admin-muted mt-1">Semana actual del equipo</p>
      </div>

      <Suspense fallback={<div className="text-sm text-sp-admin-muted">Cargando tareas…</div>}>
        <TaskWorkspace
          tasks={tasks}
          users={userOptions}
          currentUserId={session.user.id}
          suggestedCategories={suggestedCategories}
          weekLabel={weekLabel}
          relatedOptions={relatedOptions}
          relatedLabels={relatedLabels}
        />
      </Suspense>
    </div>
  );
}
