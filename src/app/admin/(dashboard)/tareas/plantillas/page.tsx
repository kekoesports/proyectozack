import { redirect } from 'next/navigation';

import { requirePermission } from '@/lib/permissions';
import { canDelete } from '@/lib/permissions';
import { getAllStaffUsers } from '@/lib/queries/staffUsers';
import { listTaskTemplates } from '@/lib/queries/taskTemplates';
import { TaskTemplatesManager } from '@/features/admin/tasks/components/TaskTemplatesManager';

export default async function TaskTemplatesPage(): Promise<React.ReactElement> {
  const session = await requirePermission('tareas', 'read');
  if (session.user.role === 'staff') {
    redirect('/admin/tareas');
  }

  const [templates, users] = await Promise.all([
    listTaskTemplates(),
    getAllStaffUsers(),
  ]);

  return (
    <TaskTemplatesManager
      templates={templates}
      users={users.map((user) => ({ id: user.id, name: user.name }))}
      canDelete={canDelete(session.user.role === 'admin' ? 'admin' : 'manager')}
    />
  );
}
