'use server';

import { revalidatePath } from 'next/cache';
import { requireAnyRole } from '@/lib/auth-guard';
import {
  createCrmBrandSchema,
  updateCrmBrandSchema,
  createBrandContactSchema,
  updateBrandContactSchema,
  createFollowupSchema,
  completeFollowupSchema,
  deleteFollowupSchema,
} from '@/lib/schemas/crmBrand';
import {
  createCrmBrand,
  updateCrmBrand,
  deleteCrmBrand,
  createBrandContact,
  updateBrandContact,
  deleteBrandContact,
  getCrmBrandOwner,
  createBrandFollowup,
  completeBrandFollowup,
  deleteBrandFollowup,
} from '@/lib/queries/crmBrands';

type ActionState = {
  readonly error?: string;
  readonly success?: boolean;
  readonly id?: number;
};

function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    obj[key] = value;
  }
  return obj;
}

function nullify<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = v === undefined ? null : v;
  return out;
}

function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out;
}

async function assertBrandOwnership(brandId: number, userId: string): Promise<string | null> {
  const ownerId = await getCrmBrandOwner(brandId);
  if (ownerId !== userId) return 'Sin permiso para modificar esta marca';
  return null;
}

export async function createBrandAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAnyRole(['admin', 'staff'], '/admin/login');

  const parsed = createCrmBrandSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const data = { ...parsed.data };
  if (session.user.role === 'staff') {
    data.ownerUserId = session.user.id;
  }

  try {
    const row = await createCrmBrand(nullify(data) as Parameters<typeof createCrmBrand>[0]);

    // Crear contacto principal si se proporcionó en el formulario
    const contactName = (formData.get('contactName') as string | null)?.trim();
    if (contactName) {
      const trim = (k: string): string | null => {
        const v = (formData.get(k) as string | null)?.trim();
        return v || null;
      };
      await createBrandContact({
        brandId:   row.id,
        name:      contactName,
        role:      trim('contactRole'),
        email:     trim('contactEmail'),
        telegram:  trim('contactTelegram'),
        discord:   trim('contactDiscord'),
        phone:     trim('contactPhone'),
        whatsapp:  null,
        notes:     null,
        isPrimary: true,
      });
    }

    revalidatePath('/admin/brands');
    return { success: true, id: row.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[admin] createBrand error:', msg);
    return { error: 'Error al crear la marca' };
  }
}

export async function updateBrandAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAnyRole(['admin', 'staff'], '/admin/login');

  const parsed = updateCrmBrandSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const { id, ...rest } = parsed.data;

  if (session.user.role === 'staff') {
    const err = await assertBrandOwnership(id, session.user.id);
    if (err) return { error: err };
    delete (rest as Record<string, unknown>).ownerUserId;
  }

  try {
    await updateCrmBrand(id, compact(rest) as Partial<Parameters<typeof updateCrmBrand>[1]>);
    revalidatePath('/admin/brands');
    revalidatePath(`/admin/brands/${id}`);
    return { success: true, id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[admin] updateBrand error:', msg);
    return { error: 'Error al actualizar la marca' };
  }
}

export async function deleteBrandAction(id: number): Promise<ActionState> {
  const session = await requireAnyRole(['admin', 'staff'], '/admin/login');

  if (session.user.role === 'staff') {
    const err = await assertBrandOwnership(id, session.user.id);
    if (err) return { error: err };
  }

  try {
    await deleteCrmBrand(id);
    revalidatePath('/admin/brands');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[admin] deleteBrand error:', msg);
    return { error: 'Error al eliminar la marca' };
  }
}

export async function createContactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAnyRole(['admin', 'staff'], '/admin/login');

  const parsed = createBrandContactSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  if (session.user.role === 'staff') {
    const err = await assertBrandOwnership(parsed.data.brandId, session.user.id);
    if (err) return { error: err };
  }

  try {
    const row = await createBrandContact(nullify(parsed.data) as Parameters<typeof createBrandContact>[0]);
    revalidatePath('/admin/brands');
    revalidatePath(`/admin/brands/${parsed.data.brandId}`);
    return { success: true, id: row.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[admin] createContact error:', msg);
    return { error: 'Error al crear el contacto' };
  }
}

export async function updateContactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAnyRole(['admin', 'staff'], '/admin/login');

  const parsed = updateBrandContactSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const { id, ...rest } = parsed.data;

  if (session.user.role === 'staff' && rest.brandId) {
    const err = await assertBrandOwnership(rest.brandId, session.user.id);
    if (err) return { error: err };
  }

  try {
    await updateBrandContact(id, compact(rest) as Partial<Parameters<typeof updateBrandContact>[1]>);
    revalidatePath('/admin/brands');
    if (rest.brandId) revalidatePath(`/admin/brands/${rest.brandId}`);
    return { success: true, id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[admin] updateContact error:', msg);
    return { error: 'Error al actualizar el contacto' };
  }
}

export async function deleteContactAction(id: number, brandId: number): Promise<ActionState> {
  const session = await requireAnyRole(['admin', 'staff'], '/admin/login');

  if (session.user.role === 'staff') {
    const err = await assertBrandOwnership(brandId, session.user.id);
    if (err) return { error: err };
  }

  try {
    await deleteBrandContact(id);
    revalidatePath('/admin/brands');
    revalidatePath(`/admin/brands/${brandId}`);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[admin] deleteContact error:', msg);
    return { error: 'Error al eliminar el contacto' };
  }
}

// --- Follow-up actions ---

export async function createFollowupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAnyRole(['admin', 'staff'], '/admin/login');

  const parsed = createFollowupSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  if (session.user.role === 'staff') {
    const err = await assertBrandOwnership(parsed.data.brandId, session.user.id);
    if (err) return { error: err };
  }

  try {
    const row = await createBrandFollowup({
      brandId: parsed.data.brandId,
      createdByUserId: session.user.id,
      scheduledAt: new Date(parsed.data.scheduledAt),
      note: parsed.data.note,
    });
    revalidatePath('/admin/brands');
    return { success: true, id: row.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[admin] createFollowup error:', msg);
    return { error: 'Error al crear el seguimiento' };
  }
}

export async function completeFollowupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAnyRole(['admin', 'staff'], '/admin/login');

  const parsed = completeFollowupSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: 'Datos inválidos' };

  if (session.user.role === 'staff') {
    const err = await assertBrandOwnership(parsed.data.brandId, session.user.id);
    if (err) return { error: err };
  }

  try {
    await completeBrandFollowup(parsed.data.id);
    revalidatePath('/admin/brands');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[admin] completeFollowup error:', msg);
    return { error: 'Error al completar el seguimiento' };
  }
}

export async function deleteFollowupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAnyRole(['admin', 'staff'], '/admin/login');

  const parsed = deleteFollowupSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: 'Datos inválidos' };

  if (session.user.role === 'staff') {
    const err = await assertBrandOwnership(parsed.data.brandId, session.user.id);
    if (err) return { error: err };
  }

  try {
    await deleteBrandFollowup(parsed.data.id);
    revalidatePath('/admin/brands');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[admin] deleteFollowup error:', msg);
    return { error: 'Error al eliminar el seguimiento' };
  }
}
