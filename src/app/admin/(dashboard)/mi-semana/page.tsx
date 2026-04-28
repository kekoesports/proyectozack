import type { ReactElement } from 'react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
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

  const pendingCount = tasks.filter((t) => t.status !== 'completada').length;
  const doneCount = tasks.filter((t) => t.status === 'completada').length;

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Mi semana"
        subtitle={weekLabel}
        stats={[
          { label: 'pendientes', value: pendingCount, accent: pendingCount > 0 ? '#f5632a' : '#72728a' },
          { label: 'completadas', value: doneCount, accent: '#16a34a' },
        ]}
      />

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
