'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requirePermission } from '@/lib/permissions';
import {
  createContractTemplate,
  updateContractTemplate,
  deleteContractTemplate,
} from '@/lib/queries/contractTemplates';
import { CONTRACT_TEMPLATE_SEEDS } from '@/lib/contractTemplateSeeds';
import { parseFormData } from '@/lib/forms/parseFormData';
import { firstError } from '@/lib/forms/firstError';
import { logRedacted } from '@/lib/log';
import { IdSchema } from '@/lib/schemas/common';

type ActionState = { readonly error?: string; readonly success?: boolean; readonly id?: number };

const TemplateCreate = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(200),
  type: z.string().trim().min(1).max(60).default('general'),
  content: z.string().trim().min(1, 'El contenido no puede estar vacío').max(200_000),
});

const TemplateUpdate = z.object({
  id: IdSchema,
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(200),
  type: z.string().trim().min(1).max(60).default('general'),
  content: z.string().trim().min(1, 'El contenido no puede estar vacío').max(200_000),
});

// ── Crear plantilla ───────────────────────────────────────────────────

export async function createTemplateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission('campanas', 'delete');

  const parsed = parseFormData(formData, TemplateCreate);
  if (!parsed.ok) return { error: firstError(parsed.fieldErrors) };

  try {
    const tpl = await createContractTemplate(parsed.data);
    revalidatePath('/admin/campanas/plantillas');
    return { success: true, id: tpl.id };
  } catch (err) {
    logRedacted('error', '[admin] createTemplate error:', err);
    return { error: 'Error al crear la plantilla' };
  }
}

// ── Actualizar plantilla ──────────────────────────────────────────────

export async function updateTemplateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission('campanas', 'delete');

  const parsed = parseFormData(formData, TemplateUpdate);
  if (!parsed.ok) return { error: firstError(parsed.fieldErrors) };
  const { id, ...rest } = parsed.data;

  try {
    await updateContractTemplate(id, rest);
    revalidatePath('/admin/campanas/plantillas');
    return { success: true };
  } catch (err) {
    logRedacted('error', '[admin] updateTemplate error:', err);
    return { error: 'Error al guardar la plantilla' };
  }
}

// ── Activar / desactivar ──────────────────────────────────────────────

export async function toggleTemplateActiveAction(id: number, isActive: boolean): Promise<ActionState> {
  await requirePermission('campanas', 'delete');
  try {
    await updateContractTemplate(id, { isActive });
    revalidatePath('/admin/campanas/plantillas');
    return { success: true };
  } catch (err) {
    logRedacted('error', '[admin] toggleTemplate error:', err);
    return { error: 'Error al guardar la plantilla' };
  }
}

// ── Eliminar ──────────────────────────────────────────────────────────

export async function deleteTemplateAction(id: number): Promise<ActionState> {
  await requirePermission('campanas', 'delete');
  try {
    await deleteContractTemplate(id);
    revalidatePath('/admin/campanas/plantillas');
    return { success: true };
  } catch (err) {
    logRedacted('error', '[admin] deleteTemplate error:', err);
    return { error: 'Error al eliminar la plantilla' };
  }
}

// ── Importar plantillas semilla ───────────────────────────────────────

export async function seedDefaultTemplatesAction(): Promise<ActionState> {
  await requirePermission('campanas', 'delete');
  try {
    let created = 0;
    for (const seed of CONTRACT_TEMPLATE_SEEDS) {
      await createContractTemplate({ name: seed.name, type: seed.type, content: seed.content });
      created++;
    }
    revalidatePath('/admin/campanas/plantillas');
    return { success: true, id: created };
  } catch (err) {
    logRedacted('error', '[admin] seedTemplates error:', err);
    return { error: 'Error al importar plantillas' };
  }
}
