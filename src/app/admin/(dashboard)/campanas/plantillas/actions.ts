'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth-guard';
import {
  createContractTemplate,
  updateContractTemplate,
  deleteContractTemplate,
} from '@/lib/queries/contractTemplates';
import { CONTRACT_TEMPLATE_SEEDS } from '@/lib/contractTemplateSeeds';

type ActionState = { readonly error?: string; readonly success?: boolean; readonly id?: number };

// ── Crear plantilla ───────────────────────────────────────────────────

export async function createTemplateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole('admin', '/admin/login');

  const name    = (formData.get('name')    as string | null)?.trim();
  const type    = (formData.get('type')    as string | null)?.trim() ?? 'general';
  const content = (formData.get('content') as string | null)?.trim();

  if (!name)    return { error: 'El nombre es obligatorio' };
  if (!content) return { error: 'El contenido no puede estar vacío' };

  try {
    const tpl = await createContractTemplate({ name, type, content });
    revalidatePath('/admin/campanas/plantillas');
    return { success: true, id: tpl.id };
  } catch (err) {
    console.error('[admin] createTemplate error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al crear la plantilla' };
  }
}

// ── Actualizar plantilla ──────────────────────────────────────────────

export async function updateTemplateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole('admin', '/admin/login');

  const id      = Number(formData.get('id'));
  const name    = (formData.get('name')    as string | null)?.trim();
  const type    = (formData.get('type')    as string | null)?.trim();
  const content = (formData.get('content') as string | null)?.trim();

  if (isNaN(id)) return { error: 'ID inválido' };
  if (!name)     return { error: 'El nombre es obligatorio' };
  if (!content)  return { error: 'El contenido no puede estar vacío' };

  try {
    await updateContractTemplate(id, { name, type: type ?? 'general', content });
    revalidatePath('/admin/campanas/plantillas');
    return { success: true };
  } catch (err) {
    console.error('[admin] updateTemplate error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al guardar la plantilla' };
  }
}

// ── Activar / desactivar ──────────────────────────────────────────────

export async function toggleTemplateActiveAction(id: number, isActive: boolean): Promise<ActionState> {
  await requireRole('admin', '/admin/login');
  try {
    await updateContractTemplate(id, { isActive });
    revalidatePath('/admin/campanas/plantillas');
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error' };
  }
}

// ── Eliminar ──────────────────────────────────────────────────────────

export async function deleteTemplateAction(id: number): Promise<ActionState> {
  await requireRole('admin', '/admin/login');
  try {
    await deleteContractTemplate(id);
    revalidatePath('/admin/campanas/plantillas');
    return { success: true };
  } catch (err) {
    console.error('[admin] deleteTemplate error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al eliminar la plantilla' };
  }
}

// ── Importar plantillas semilla ───────────────────────────────────────

export async function seedDefaultTemplatesAction(): Promise<ActionState> {
  await requireRole('admin', '/admin/login');
  try {
    let created = 0;
    for (const seed of CONTRACT_TEMPLATE_SEEDS) {
      await createContractTemplate({ name: seed.name, type: seed.type, content: seed.content });
      created++;
    }
    revalidatePath('/admin/campanas/plantillas');
    return { success: true, id: created };
  } catch (err) {
    console.error('[admin] seedTemplates error:', err instanceof Error ? err.message : 'unknown');
    return { error: 'Error al importar plantillas' };
  }
}
