'use server';

import { revalidatePath } from 'next/cache';

import { requireAnyRole } from '@/lib/auth-guard';
import { assertCanDelete } from '@/lib/permissions';
import { parseFormData } from '@/lib/forms/parseFormData';
import { firstError } from '@/lib/forms/firstError';
import { logRedacted } from '@/lib/log';
import { createTaskTemplateSchema, updateTaskTemplateSchema } from '@/lib/schemas/taskTemplate';
import { createTaskTemplate, deleteTaskTemplate, updateTaskTemplate } from '@/lib/queries/taskTemplates';

import { compact } from '@/lib/utils/objects';

type ActionResult = { readonly error?: string };

const REVALIDATE = '/admin/tareas/plantillas';

export async function createTaskTemplateAction(formData: FormData): Promise<ActionResult> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');

  const parsed = parseFormData(formData, createTaskTemplateSchema);
  if (!parsed.ok) return { error: firstError(parsed.fieldErrors) };

  try {
    await createTaskTemplate({
      ...parsed.data,
      description: parsed.data.description ?? null,
      defaultAssigneeUserId: parsed.data.defaultAssigneeUserId ?? null,
    });
    revalidatePath(REVALIDATE);
    return {};
  } catch (err) {
    logRedacted('error', '[admin] createTaskTemplate error:', err);
    return { error: 'Error al crear plantilla' };
  }
}

export async function updateTaskTemplateAction(formData: FormData): Promise<ActionResult> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');

  const parsed = parseFormData(formData, updateTaskTemplateSchema);
  if (!parsed.ok) return { error: firstError(parsed.fieldErrors) };

  const { id, ...rest } = parsed.data;
  try {
    await updateTaskTemplate(id, compact({
      ...rest,
      description: rest.description ?? null,
      defaultAssigneeUserId: rest.defaultAssigneeUserId ?? null,
    }));
    revalidatePath(REVALIDATE);
    return {};
  } catch (err) {
    logRedacted('error', '[admin] updateTaskTemplate error:', err);
    return { error: 'Error al actualizar plantilla' };
  }
}

export async function deleteTaskTemplateAction(id: number): Promise<ActionResult> {
  const session = await requireAnyRole(['admin', 'manager'], '/admin/login');
  try {
    assertCanDelete(session.user.role);
  } catch {
    return { error: 'Sin permiso para eliminar' };
  }
  try {
    await deleteTaskTemplate(id);
    revalidatePath(REVALIDATE);
    return {};
  } catch (err) {
    logRedacted('error', '[admin] deleteTaskTemplate error:', err);
    return { error: 'Error al borrar plantilla' };
  }
}
