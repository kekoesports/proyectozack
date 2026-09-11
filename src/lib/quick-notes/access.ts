import type { NoteActor } from '@/lib/schemas/quickNote';
import type { crmTasks } from '@/db/schema/crmTasks';

// Matches tareas:write and existing ownership rules; never grants admin-wide visibility to limited admins.
export function canUseQuickNotes(role: string): boolean {
  return [
    'admin',
    'admin_limited_tasks',
    'manager',
    'ops',
    'staff',
    'editor',
    'talent_manager',
  ].includes(role);
}
export function canAssignTasksToOthers(
  role: string | null | undefined,
): boolean {
  return (
    !!role && ['admin', 'admin_limited_tasks', 'manager', 'ops'].includes(role)
  );
}
export function canReadTask(
  actor: NoteActor,
  task: typeof crmTasks.$inferSelect,
): boolean {
  return (
    actor.role === 'admin' ||
    [task.ownerId, task.assignedToUserId, task.createdByUserId].includes(
      actor.userId,
    )
  );
}
export function canManageTask(
  actor: NoteActor,
  task: typeof crmTasks.$inferSelect,
): boolean {
  return (
    actor.role === 'admin' ||
    [task.ownerId, task.assignedToUserId].includes(actor.userId)
  );
}
