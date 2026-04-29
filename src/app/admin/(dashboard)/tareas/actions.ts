'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAnyRole } from '@/lib/auth-guard';
import {
  completeTask,
  createTask,
  createTaskTemplate,
  deleteTask,
  deleteTasks,
  deleteTaskTemplate,
  getTaskTemplates,
  isStaffUser,
  rollOverPendingTasks,
  taskExistsForWeek,
  updateTask,
  updateTaskTemplate,
} from '@/lib/queries/crmTasks';
import { taskFormSchema, taskPatchSchema } from '@/lib/schemas/task';
import { getIsoWeekLabel } from '@/lib/week';
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
  const ok = await isStaffUser(ownerId);
  return ok ? null : 'El usuario asignado debe ser admin o staff';
}

function compactPatch<T extends Record<string, unknown>>(
  patch: T,
): { [K in keyof T]?: Exclude<T[K], undefined> } {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) result[key] = value;
  }
  return result as { [K in keyof T]?: Exclude<T[K], undefined> };
}

export async function createTaskAction(input: unknown): Promise<ActionResult> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');

  const parsed = taskFormSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const data = parsed.data;
  const ownerErr = await assertStaffOwner(data.ownerId);
  if (ownerErr) return { error: ownerErr };

  await createTask({
    title: data.title,
    description: data.description,
    ownerId: data.ownerId,
    dueDate: data.dueDate,
    priority: data.priority,
    status: data.status,
    category: data.category,
    weekLabel: weekLabelForDueDate(data.dueDate),
    relatedType: data.relatedType ?? null,
    relatedId: data.relatedId ?? null,
  });

  revalidateAll();
  return {};
}

export async function updateTaskAction(id: number, input: unknown): Promise<ActionResult> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');

  const parsed = taskFormSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const ownerErr = await assertStaffOwner(parsed.data.ownerId);
  if (ownerErr) return { error: ownerErr };

  await updateTask(id, {
    ...parsed.data,
    relatedType: parsed.data.relatedType ?? null,
    relatedId: parsed.data.relatedId ?? null,
  });
  revalidateAll();
  return {};
}

export async function updateTaskPartialAction(
  id: unknown,
  input: unknown,
): Promise<ActionResult> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');

  const parsedId = z.number().int().positive().safeParse(id);
  if (!parsedId.success) return { error: 'ID inválido' };

  const parsed = taskPatchSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  if (parsed.data.ownerId !== undefined) {
    const ownerErr = await assertStaffOwner(parsed.data.ownerId);
    if (ownerErr) return { error: ownerErr };
  }

  const updated = await updateTask(parsedId.data, compactPatch(parsed.data));
  if (updated === null) return { error: 'Tarea no encontrada' };

  revalidateAll();
  return {};
}

export async function completeTaskAction(id: number): Promise<ActionResult> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');
  await completeTask(id);
  revalidateAll();
  return {};
}

export async function deleteTaskAction(id: number): Promise<ActionResult> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');
  await deleteTask(id);
  revalidateAll();
  return {};
}

export async function bulkDeleteTasksAction(ids: number[]): Promise<ActionResult> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');
  if (ids.length === 0) return {};
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
  const session  = await requireAnyRole(['admin', 'staff'], '/admin/login');
  const weekLabel = getIsoWeekLabel(new Date());
  const templates = await getTaskTemplates();
  const active    = templates.filter((t) => t.isActive);
  let created = 0;
  let skipped = 0;

  for (const tpl of active) {
    const exists = await taskExistsForWeek(tpl.title, weekLabel);
    if (exists) { skipped++; continue; }
    try {
      await createTask({
        title: tpl.title, description: null, ownerId: session.user.id,
        dueDate: null, priority: tpl.priority, status: 'pendiente',
        category: tpl.category, weekLabel, relatedType: null, relatedId: null,
      });
      created++;
    } catch { skipped++; }
  }

  revalidateAll();
  return { created, skipped };
}

/** Crea la tarea de una plantilla específica por ID (si no existe ya esta semana). */
export async function createSingleTemplateAction(templateId: number): Promise<ActionResult> {
  const session   = await requireAnyRole(['admin', 'staff'], '/admin/login');
  const weekLabel = getIsoWeekLabel(new Date());
  const templates = await getTaskTemplates();
  const tpl       = templates.find((t) => t.id === templateId);
  if (!tpl) return { error: 'Plantilla no encontrada' };

  const exists = await taskExistsForWeek(tpl.title, weekLabel);
  if (exists) return { error: 'Ya existe esta semana' };

  try {
    await createTask({
      title: tpl.title, description: null, ownerId: session.user.id,
      dueDate: null, priority: tpl.priority, status: 'pendiente',
      category: tpl.category, weekLabel, relatedType: null, relatedId: null,
    });
    revalidateAll();
    return {};
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[admin] createSingleTemplate error:', msg);
    return { error: 'Error al crear la tarea' };
  }
}

// ── CRUD de definiciones de plantillas ────────────────────────────────

export async function saveTemplateDefinitionAction(
  id: number | null,
  data: { title: string; category: string; priority: 'alta' | 'media' | 'baja' },
): Promise<{ error?: string; template?: CrmTaskTemplate | undefined }> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');
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
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[admin] saveTemplateDefinition error:', msg);
    return { error: 'Error al guardar la plantilla' };
  }
}

export async function toggleTemplateActiveAction(id: number, isActive: boolean): Promise<ActionResult> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');
  await updateTaskTemplate(id, { isActive });
  revalidatePath('/admin/tareas');
  return {};
}

export async function deleteTemplateDefinitionAction(id: number): Promise<ActionResult> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');
  await deleteTaskTemplate(id);
  revalidatePath('/admin/tareas');
  return {};
}

// ── Arrastre automático ───────────────────────────────────────────────

export type RollOverResult = {
  readonly rolled: number;
};

/** Arrastra tareas pendientes/en_progreso de la semana anterior a la actual. */
export async function rollOverTasksAction(): Promise<RollOverResult> {
  await requireAnyRole(['admin', 'staff'], '/admin/login');
  const currentWeek = getIsoWeekLabel(new Date());
  const prevWeek    = getIsoWeekLabel(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const result = await rollOverPendingTasks(prevWeek, currentWeek);
  revalidateAll();
  return result;
}
