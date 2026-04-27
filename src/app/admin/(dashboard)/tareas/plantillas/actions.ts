'use server';

import { revalidatePath } from 'next/cache';

import { requireAnyRole } from '@/lib/auth-guard';
import { assertCanDelete } from '@/lib/permissions';
import { createTaskTemplateSchema, updateTaskTemplateSchema } from '@/lib/schemas/taskTemplate';
import { createTaskTemplate, deleteTaskTemplate, updateTaskTemplate } from '@/lib/queries/taskTemplates';

import type { Role } from '@/lib/auth-guard';

type ActionResult = { readonly error?: string };

function revalidateTemplates(): void {
  revalidatePath('/admin/tareas/plantillas');
}

function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

export async function createTaskTemplateAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAnyRole(['admin', 'manager'], '/admin/login');
    const raw = Object.fromEntries(formData);
    const parsed = createTaskTemplateSchema.safeParse(raw);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

    await createTaskTemplate({
      ...parsed.data,
      description: parsed.data.description ?? null,
      defaultAssigneeUserId: parsed.data.defaultAssigneeUserId ?? null,
    });
    revalidateTemplates();
    return {};
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return { error: msg !== 'unknown' ? msg : 'Error al crear plantilla' };
  }
}

export async function updateTaskTemplateAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAnyRole(['admin', 'manager'], '/admin/login');
    const raw = Object.fromEntries(formData);
    const parsed = updateTaskTemplateSchema.safeParse(raw);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

    const { id, ...rest } = parsed.data;
    await updateTaskTemplate(id, compact({
      ...rest,
      description: rest.description ?? null,
      defaultAssigneeUserId: rest.defaultAssigneeUserId ?? null,
    }));
    revalidateTemplates();
    return {};
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return { error: msg !== 'unknown' ? msg : 'Error al actualizar plantilla' };
  }
}

export async function deleteTaskTemplateAction(id: number): Promise<ActionResult> {
  try {
    const session = await requireAnyRole(['admin', 'manager'], '/admin/login');
    assertCanDelete(session.user.role as Role);
    await deleteTaskTemplate(id);
    revalidateTemplates();
    return {};
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return { error: msg !== 'unknown' ? msg : 'Error al borrar plantilla' };
  }
}
