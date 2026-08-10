'use server';

import { revalidatePath } from 'next/cache';

import { requireAnyRole } from '@/lib/auth-guard';
import { requirePermission } from '@/lib/permissions';
import { logRedacted } from '@/lib/log';

/** Roles allowed to mutate global task template definitions. */
const TEMPLATE_MANAGER_ROLES = [
  'admin',
  'admin_limited_tasks',
  'manager',
  'ops',
] as const;

/** Roles that may create/reassign tasks for other users. */
const TASK_ASSIGN_OTHERS_ROLES = [
  'admin',
  'admin_limited_tasks',
  'manager',
  'ops',
] as const;

function canAssignTasksToOthers(role: string | null | undefined): boolean {
  return (
    !!role &&
    (TASK_ASSIGN_OTHERS_ROLES as readonly string[]).includes(role)
  );
}
import {
  completeTask,
  createTask,
  createTaskTemplate,
  deleteTask,
  getTaskById,
  getTasksByIds,
  isAssignableTaskUser,
  deleteTasks,
  deleteTaskTemplate,
  getTaskTemplates,
  resetRolledOver,
  resetRolledOverBulk,
  rollOverPendingTasks,
  taskExistsForWeek,
  updateTask,
  updateTaskTemplate,
} from '@/lib/queries/crmTasks';
import { createAlert } from '@/lib/queries/alerts';
import { IdSchema } from '@/lib/schemas/common';
import { taskFormSchema, taskPatchSchema } from '@/lib/schemas/task';
import { compact } from '@/lib/utils/objects';
import { getIsoWeekLabel } from '@/lib/utils/week';

import type { CrmTaskTemplate } from '@/types';

export type { TaskFormInput } from '@/lib/schemas/task';

type ActionResult = { readonly error?: string };

function revalidateAll(): void {
  revalidatePath('/admin/tareas');
  revalidatePath('/admin/mi-semana');
  revalidatePath('/admin/equipo');
}

function weekLabelForDueDate(dueDate: string | null): string {
  if (!dueDate) return getIsoWeekLabel(new Date());
  // `dueDate` is YYYY-MM-DD civil in Madrid. Parse as Madrid noon to avoid TZ edges.
  const [y, m, d] = dueDate.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) {
    return getIsoWeekLabel(new Date());
  }
  const noonUtc = new Date(Date.UTC(y, m - 1, d, 10, 0, 0)); // 10 UTC = ~noon Madrid
  return getIsoWeekLabel(noonUtc);
}

async function assertStaffOwner(ownerId: string): Promise<string | null> {
  const ok = await isAssignableTaskUser(ownerId);
  return ok ? null : 'El usuario asignado debe ser admin, manager o staff';
}

export async function createTaskAction(input: unknown): Promise<ActionResult> {
  const session = await requirePermission('tareas', 'write');

  const parsed = taskFormSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const data = parsed.data;
  // staff/editor/tm may only create tasks for themselves (write was expanded for own-task UX).
  if (!canAssignTasksToOthers(session.user.role) && data.ownerId !== session.user.id) {
    return { error: 'Solo puedes crear tareas propias' };
  }
  const ownerErr = await assertStaffOwner(data.ownerId);
  if (ownerErr) return { error: ownerErr };

  const coResponsable =
    canAssignTasksToOthers(session.user.role) &&
    data.assignedToUserId &&
    data.assignedToUserId !== data.ownerId
      ? data.assignedToUserId
      : null;

  await createTask({
    title: data.title,
    description: data.description,
    ownerId: data.ownerId,
    assignedToUserId: coResponsable ?? data.ownerId,
    createdByUserId: session.user.id,
    recurrenceTemplateId: data.recurrenceTemplateId ?? null,
    dueDate: data.dueDate,
    priority: data.priority,
    status: data.status,
    category: data.category,
    weekLabel: weekLabelForDueDate(data.dueDate),
    relatedType: data.relatedType ?? null,
    relatedId: data.relatedId ?? null,
  });

  if (coResponsable) {
    const assigner = session.user.name ?? session.user.email;
    await createAlert({
      type:              'task_assigned',
      title:             `Te han asignado una tarea: ${data.title}`,
      description:       `Asignado por ${assigner}`,
      severity:          'low',
      assignedToUserId:  coResponsable,
      relatedEntityType: 'task',
    });
  }

  revalidateAll();
  return {};
}

export async function updateTaskAction(id: number, input: unknown): Promise<ActionResult> {
  const session = await requirePermission('tareas', 'write');

  const parsed = taskFormSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  if (!canAssignTasksToOthers(session.user.role) && parsed.data.ownerId !== session.user.id) {
    return { error: 'Solo puedes asignarte tareas a ti mismo' };
  }
  const ownerErr = await assertStaffOwner(parsed.data.ownerId);
  if (ownerErr) return { error: ownerErr };

  const prevTask = await getTaskById(id);

  if (session.user.role !== 'admin') {
    if (!prevTask) return { error: 'Tarea no encontrada' };
    if (prevTask.ownerId !== session.user.id && prevTask.assignedToUserId !== session.user.id) {
      return { error: 'Sin permiso para modificar esta tarea' };
    }
  }

  const newCoResponsable =
    canAssignTasksToOthers(session.user.role) &&
    parsed.data.assignedToUserId &&
    parsed.data.assignedToUserId !== parsed.data.ownerId
      ? parsed.data.assignedToUserId
      : null;
  const prevCoResponsable = prevTask?.assignedToUserId && prevTask.assignedToUserId !== prevTask.ownerId
    ? prevTask.assignedToUserId
    : null;

  await updateTask(id, {
    title: parsed.data.title,
    description: parsed.data.description,
    ownerId: parsed.data.ownerId,
    assignedToUserId: newCoResponsable ?? parsed.data.ownerId,
    recurrenceTemplateId: parsed.data.recurrenceTemplateId ?? null,
    dueDate: parsed.data.dueDate,
    priority: parsed.data.priority,
    status: parsed.data.status,
    category: parsed.data.category,
    relatedType: parsed.data.relatedType ?? null,
    relatedId: parsed.data.relatedId ?? null,
  });

  if (newCoResponsable && newCoResponsable !== prevCoResponsable) {
    const assigner = session.user.name ?? session.user.email;
    await createAlert({
      type:              'task_assigned',
      title:             `Te han asignado una tarea: ${parsed.data.title}`,
      description:       `Asignado por ${assigner}`,
      severity:          'low',
      assignedToUserId:  newCoResponsable,
      relatedEntityType: 'task',
      relatedEntityId:   id,
    });
  }

  revalidateAll();
  return {};
}

export async function updateTaskPartialAction(
  id: unknown,
  input: unknown,
): Promise<ActionResult> {
  const session = await requirePermission('tareas', 'write');

  const parsedId = IdSchema.safeParse(id);
  if (!parsedId.success) return { error: 'ID inválido' };

  const parsed = taskPatchSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  if (parsed.data.ownerId !== undefined) {
    if (!canAssignTasksToOthers(session.user.role) && parsed.data.ownerId !== session.user.id) {
      return { error: 'Solo puedes asignarte tareas a ti mismo' };
    }
    const ownerErr = await assertStaffOwner(parsed.data.ownerId);
    if (ownerErr) return { error: ownerErr };
  }

  if (session.user.role !== 'admin') {
    const task = await getTaskById(parsedId.data);
    if (!task) return { error: 'Tarea no encontrada' };
    if (task.ownerId !== session.user.id && task.assignedToUserId !== session.user.id) {
      return { error: 'Sin permiso para modificar esta tarea' };
    }
  }

  const patch = { ...parsed.data };
  if (!canAssignTasksToOthers(session.user.role)) {
    // Non-elevated callers cannot reassign ownership or co-assignee via patch.
    delete patch.ownerId;
    delete patch.assignedToUserId;
  }

  const updated = await updateTask(
    parsedId.data,
    compact({
      ...patch,
      assignedToUserId: patch.ownerId ?? patch.assignedToUserId,
    }),
  );
  if (updated === null) return { error: 'Tarea no encontrada' };

  revalidateAll();
  return {};
}

export async function completeTaskAction(id: number): Promise<ActionResult> {
  const session = await requirePermission('tareas', 'write');
  if (session.user.role !== 'admin') {
    const task = await getTaskById(id);
    if (!task) return { error: 'Tarea no encontrada' };
    if (task.ownerId !== session.user.id && task.assignedToUserId !== session.user.id) {
      return { error: 'Sin permiso para completar esta tarea' };
    }
  }
  await completeTask(id);
  revalidateAll();
  return {};
}

export async function deleteTaskAction(id: number): Promise<ActionResult> {
  const session = await requirePermission('tareas', 'delete');
  if (session.user.role !== 'admin') {
    const task = await getTaskById(id);
    if (!task) return { error: 'Tarea no encontrada' };
    if (task.ownerId !== session.user.id && task.assignedToUserId !== session.user.id) {
      return { error: 'Sin permiso para eliminar esta tarea' };
    }
  }
  try {
    await deleteTask(id);
    revalidateAll();
    return {};
  } catch (err) {
    logRedacted('error', '[admin] deleteTask error:', err);
    return { error: 'Error al eliminar tarea' };
  }
}

export async function bulkDeleteTasksAction(ids: number[]): Promise<ActionResult> {
  const session = await requirePermission('tareas', 'delete');
  if (ids.length === 0) return {};
  if (session.user.role !== 'admin') {
    const tasks = await getTasksByIds(ids);
    if (tasks.length !== ids.length) return { error: 'Una o más tareas no encontradas' };
    const forbidden = tasks.filter(
      (t) => t.ownerId !== session.user.id && t.assignedToUserId !== session.user.id,
    );
    if (forbidden.length > 0) {
      return { error: `No puedes eliminar ${forbidden.length} tarea(s) de otros miembros` };
    }
  }
  await deleteTasks(ids);
  revalidateAll();
  return {};
}

// ── Plantillas semanales ──────────────────────────────────────────────

export type CreateTemplatesResult = {
  readonly created: number;
  readonly skipped: number;
  readonly error?: string;
};

/** Crea solo las plantillas activas que NO existen todavía en la semana actual. */
export async function createWeeklyTemplatesAction(): Promise<CreateTemplatesResult> {
  const session  = await requirePermission('tareas', 'write');
  const weekLabel = getIsoWeekLabel(new Date());
  const templates = await getTaskTemplates();
  const active    = templates.filter((t) => t.active);
  let created = 0;
  let skipped = 0;

  for (const tpl of active) {
    const exists = await taskExistsForWeek(tpl.title, weekLabel);
    if (exists) { skipped++; continue; }
    try {
      await createTask({
        title: tpl.title, description: null, ownerId: session.user.id,
        dueDate: null, priority: tpl.defaultPriority, status: 'pendiente',
        category: tpl.category, weekLabel, relatedType: null, relatedId: null,
      });
      created++;
    } catch (err) { logRedacted('warn', '[createWeeklyTemplates] row error:', err); skipped++; }
  }

  revalidateAll();
  return { created, skipped };
}

/** Crea la tarea de una plantilla específica por ID (si no existe ya esta semana). */
export async function createSingleTemplateAction(templateId: number): Promise<ActionResult> {
  const session   = await requirePermission('tareas', 'write');
  const weekLabel = getIsoWeekLabel(new Date());
  const templates = await getTaskTemplates();
  const tpl       = templates.find((t) => t.id === templateId);
  if (!tpl) return { error: 'Plantilla no encontrada' };

  const exists = await taskExistsForWeek(tpl.title, weekLabel);
  if (exists) return { error: 'Ya existe esta semana' };

  try {
    await createTask({
      title: tpl.title, description: null, ownerId: session.user.id,
      dueDate: null, priority: tpl.defaultPriority, status: 'pendiente',
        category: tpl.category, weekLabel, relatedType: null, relatedId: null,
    });
    revalidateAll();
    return {};
  } catch (err) {
    logRedacted('error', '[admin] createSingleTemplate error:', err);
    return { error: 'Error al crear la tarea' };
  }
}

// ── CRUD de definiciones de plantillas ────────────────────────────────

export async function saveTemplateDefinitionAction(
  id: number | null,
  data: { title: string; category: string; priority: 'alta' | 'media' | 'baja' },
): Promise<{ error?: string; template?: CrmTaskTemplate | undefined }> {
  await requireAnyRole(TEMPLATE_MANAGER_ROLES, '/admin/login');
  const title = data.title.trim();
  if (!title) return { error: 'El título no puede estar vacío' };

  try {
    if (id) {
      const updated = await updateTaskTemplate(id, data);
      revalidatePath('/admin/tareas');
      return { template: updated ?? undefined };
    } else {
      const created = await createTaskTemplate(data);
      revalidatePath('/admin/tareas');
      return { template: created };
    }
  } catch (err) {
    logRedacted('error', '[admin] saveTemplateDefinition error:', err);
    return { error: 'Error al guardar la plantilla' };
  }
}

export async function toggleTemplateActiveAction(id: number, isActive: boolean): Promise<ActionResult> {
  await requireAnyRole(TEMPLATE_MANAGER_ROLES, '/admin/login');
  await updateTaskTemplate(id, { isActive });
  revalidatePath('/admin/tareas');
  return {};
}

export async function deleteTemplateDefinitionAction(id: number): Promise<ActionResult> {
  await requirePermission('tareas', 'delete');
  await deleteTaskTemplate(id);
  revalidatePath('/admin/tareas');
  return {};
}

// ── Revisión de tareas arrastradas ───────────────────────────────────

/** Quita el flag "arrastrada" de una tarea. No cambia su status. */
export async function resetRolledOverAction(id: unknown): Promise<ActionResult> {
  const session = await requirePermission('tareas', 'write');
  const parsed = IdSchema.safeParse(id);
  if (!parsed.success) return { error: 'ID inválido' };
  const callerId = session.user.role !== 'admin' ? session.user.id : undefined;
  await resetRolledOver(parsed.data, callerId);
  revalidateAll();
  return {};
}

/** Quita el flag "arrastrada" de un conjunto de tareas de una vez. */
export async function resetRolledOverBulkAction(ids: unknown): Promise<ActionResult> {
  const session = await requirePermission('tareas', 'write');
  const parsed = IdSchema.array().safeParse(ids);
  if (!parsed.success) return { error: 'IDs inválidos' };
  const callerId = session.user.role !== 'admin' ? session.user.id : undefined;
  await resetRolledOverBulk(parsed.data, callerId);
  revalidateAll();
  return {};
}

// ── Arrastre automático ───────────────────────────────────────────────

export type RollOverResult = {
  readonly rolled: number;
};

/** Arrastra tareas pendientes/en_progreso de la semana anterior a la actual (admin/ops only). */
export async function rollOverTasksAction(): Promise<RollOverResult> {
  // Global side-effect — not available to staff. Prefer the cron job.
  await requireAnyRole(TEMPLATE_MANAGER_ROLES, '/admin/login');
  const currentWeek = getIsoWeekLabel(new Date());
  const prevWeek    = getIsoWeekLabel(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const result = await rollOverPendingTasks(prevWeek, currentWeek);
  revalidateAll();
  return result;
}
