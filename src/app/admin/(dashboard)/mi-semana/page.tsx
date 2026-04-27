import type { ReactElement } from 'react';
import { requireAnyRole } from '@/lib/auth-guard';
import {
  getMyTasks,
  getRolledOverCount,
  getUsedCategories,
  getTaskRelatedOptions,
} from '@/lib/queries/crmTasks';
import { getAllStaffUsers } from '@/lib/queries/staffUsers';
import { getIsoWeekLabel } from '@/lib/utils/week';
import { RolledOverBanner } from '@/features/admin/tasks/components/RolledOverBanner';
import { TaskList } from '@/features/admin/tasks/components/TaskList';

export const metadata = { title: 'Mi Semana | Admin' };

export default async function MiSemanaPage(): Promise<ReactElement> {
  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');
  const weekLabel = getIsoWeekLabel(new Date());

  const [tasks, users, suggestedCategories, rolledCount, relatedOptions] = await Promise.all([
    getMyTasks(session.user.id, weekLabel),
    getAllStaffUsers(),
    getUsedCategories(),
    getRolledOverCount(session.user.id, weekLabel),
    getTaskRelatedOptions(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-black uppercase text-sp-admin-text">Mi semana</h1>
        <p className="text-sm text-sp-admin-muted mt-1">Tus tareas para {weekLabel}</p>
      </div>

      <RolledOverBanner count={rolledCount} />

      <TaskList
        tasks={tasks}
        users={users.map((u) => ({ id: u.id, name: u.name }))}
        currentUserId={session.user.id}
        suggestedCategories={suggestedCategories}
        weekLabel={weekLabel}
        relatedOptions={relatedOptions}
      />
    </div>
  );
}
