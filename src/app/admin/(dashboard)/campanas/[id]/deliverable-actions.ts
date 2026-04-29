'use server';

import { revalidatePath } from 'next/cache';
import { requireAnyRole } from '@/lib/auth-guard';
import {
  createDeliverableSchema,
  updateDeliverableStatusSchema,
} from '@/lib/schemas/deliverable';
import {
  createDeliverable,
  transitionDeliverableStatus,
  deleteDeliverable,
} from '@/lib/queries/deliverables';

type ActionResult = { readonly success: true } | { readonly success: false; readonly error: string };

function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    obj[key] = value;
  }
  return obj;
}

export async function createDeliverableAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAnyRole(['admin', 'manager'], '/admin/login');
  void session;

  const parsed = createDeliverableSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  const { dueDate, contentUrl, description, ...rest } = parsed.data;

  try {
    await createDeliverable({
      ...rest,
      ...(description !== undefined ? { description } : {}),
      ...(dueDate !== undefined ? { dueDate } : {}),
      ...(contentUrl !== undefined ? { contentUrl } : {}),
    });
    revalidatePath(`/admin/campanas/${rest.campaignId}`);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[admin] createDeliverable error:', msg);
    return { success: false, error: 'Error al crear el deliverable' };
  }
}

export async function transitionDeliverableAction(data: {
  deliverableId: number;
  status: string;
  campaignId: number;
  comment?: string;
  contentUrl?: string;
  revisionNotes?: string;
}): Promise<ActionResult> {
  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');

  const parsed = updateDeliverableStatusSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    const opts: Parameters<typeof transitionDeliverableStatus>[2] = {
      userId: session.user.id,
    };
    if (parsed.data.comment) opts.comment = parsed.data.comment;
    if (parsed.data.contentUrl) opts.contentUrl = parsed.data.contentUrl;
    if (parsed.data.revisionNotes) opts.revisionNotes = parsed.data.revisionNotes;

    const result = await transitionDeliverableStatus(
      parsed.data.deliverableId,
      parsed.data.status,
      opts,
    );

    if (!result) {
      return { success: false, error: 'Transición de estado no permitida' };
    }

    revalidatePath(`/admin/campanas/${data.campaignId}`);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[admin] transitionDeliverable error:', msg);
    return { success: false, error: 'Error al actualizar el estado' };
  }
}

export async function deleteDeliverableAction(
  deliverableId: number,
  campaignId: number,
): Promise<ActionResult> {
  await requireAnyRole(['admin', 'manager'], '/admin/login');

  try {
    const deleted = await deleteDeliverable(deliverableId);
    if (!deleted) return { success: false, error: 'No se puede eliminar este deliverable' };
    revalidatePath(`/admin/campanas/${campaignId}`);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[admin] deleteDeliverable error:', msg);
    return { success: false, error: 'Error al eliminar' };
  }
}
