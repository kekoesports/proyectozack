import { requireAnyRole } from '@/lib/auth-guard';
import { canDelete } from '@/lib/permissions';
import { getAllStaffUsers } from '@/lib/queries/staffUsers';
import { listTaskTemplates } from '@/lib/queries/taskTemplates';
import { TaskTemplatesManager } from '@/features/admin/tasks/components/TaskTemplatesManager';

/** Same allow-list as plantillas/actions and tareas/actions template CRUD. */
const TEMPLATE_MANAGER_ROLES = [
  'admin',
  'admin_limited_tasks',
  'manager',
  'ops',
] as const;

export default async function TaskTemplatesPage(): Promise<React.ReactElement> {
  const session = await requireAnyRole(TEMPLATE_MANAGER_ROLES, '/admin/login');

  const [templates, users] = await Promise.all([
    listTaskTemplates(),
    getAllStaffUsers(),
  ]);

  return (
    <TaskTemplatesManager
      templates={templates}
      users={users.map((user) => ({ id: user.id, name: user.name }))}
      canDelete={canDelete(session.user.role)}
    />
  );
}
