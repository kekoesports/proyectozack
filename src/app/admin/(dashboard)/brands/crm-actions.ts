'use server';

import { revalidatePath } from 'next/cache';

import { requireAnyRole } from '@/lib/auth-guard';
import { assertCanDelete, needsVisibilityFilter } from '@/lib/permissions';
import { logRedacted } from '@/lib/log';
import {
  createCrmBrandSchema,
  updateCrmBrandSchema,
  createBrandContactSchema,
  updateBrandContactSchema,
  createFollowupSchema,
  updateFollowupSchema,
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
  createBrandFollowup,
  updateBrandFollowup,
  completeBrandFollowup,
  deleteBrandFollowup,
  getCrmBrandForPermission,
} from '@/lib/queries/crmBrands';

import { compact, nullify } from '@/lib/utils/objects';

import type { Role } from '@/lib/auth-guard';

type ActionState = {
  readonly error?: string;
  readonly success?: boolean;
  readonly id?: number;
};

function formToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  const rateCard: Record<string, number> = {};

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    // Parse defaultRateCard[tier] fields into a nested object
    const rateMatch = key.match(/^defaultRateCard\[(\w+)\]$/);
    if (rateMatch) {
      const tier = rateMatch[1];
      const num = parseFloat(String(value));
      if (!isNaN(num) && num > 0 && tier) rateCard[tier] = num;
      continue;
    }
    obj[key] = value;
  }

  if (Object.keys(rateCard).length > 0) obj.defaultRateCard = rateCard;
  return obj;
}

/** Convert date string (YYYY-MM-DD) to Date object, or undefined if empty/invalid */
function parseOptionalDate(val: string | undefined | null): Date | undefined {
  if (!val || val.trim() === '') return undefined;
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d;
}

// ── Permission helpers ────────────────────────────────────────────────────────

async function assertCanEditBrand(
  brandId: number,
  session: { userId: string; role: Role },
): Promise<void> {
  // admin and manager can always edit
  if (!needsVisibilityFilter(session.role)) return;

  const brand = await getCrmBrandForPermission(brandId);
  if (!brand) throw new Error('forbidden:edit:brand');

  const isOwner =
    brand.assignedToUserId   === session.userId ||
    brand.coAssignedToUserId === session.userId ||
    brand.createdByUserId    === session.userId;

  if (!isOwner) throw new Error('forbidden:edit:brand');
}

// ── Brand actions ─────────────────────────────────────────────────────────────

export async function createBrandAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');

  const parsed = createCrmBrandSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const { lastContactAt, nextFollowupAt, ...rest } = parsed.data;
  const data = {
    ...rest,
    createdByUserId: session.user.id,
    lastContactAt: parseOptionalDate(lastContactAt),
    nextFollowupAt: parseOptionalDate(nextFollowupAt),
  };

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
    logRedacted('error', '[admin] createBrand error:', msg);
    return { error: 'Error al crear la marca' };
  }
}

export async function updateBrandAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');

  const parsed = updateCrmBrandSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const { id, lastContactAt, nextFollowupAt, ...rest } = parsed.data;
  const patchData = {
    ...rest,
    lastContactAt: parseOptionalDate(lastContactAt),
    nextFollowupAt: parseOptionalDate(nextFollowupAt),
    updatedAt: new Date(),
  };

  try {
    await assertCanEditBrand(id, { userId: session.user.id, role: session.user.role });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    if (msg.startsWith('forbidden:')) return { error: 'Sin permiso para modificar esta marca' };
    logRedacted('error', '[admin] updateBrand permission error:', msg);
    return { error: 'Error al verificar permisos' };
  }

  try {
    await updateCrmBrand(
      id,
      compact(patchData) as Partial<Parameters<typeof updateCrmBrand>[1]>,
    );
    revalidatePath('/admin/brands');
    revalidatePath(`/admin/brands/${id}`);
    return { success: true, id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    logRedacted('error', '[admin] updateBrand error:', msg);
    return { error: 'Error al actualizar la marca' };
  }
}

export async function deleteBrandAction(id: number): Promise<ActionState> {
  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');

  try {
    assertCanDelete(session.user.role);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    if (msg.startsWith('forbidden:delete:')) return { error: msg };
    logRedacted('error', '[admin] deleteBrand permission error:', msg);
    return { error: 'Sin permiso para eliminar marcas' };
  }

  try {
    await assertCanEditBrand(id, { userId: session.user.id, role: session.user.role });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    if (msg.startsWith('forbidden:')) return { error: 'Sin permiso para eliminar esta marca' };
    logRedacted('error', '[admin] deleteBrand ownership error:', msg);
    return { error: 'Error al verificar permisos' };
  }

  try {
    await deleteCrmBrand(id);
    revalidatePath('/admin/brands');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    // PG FK violation code: 23503
    const isFkViolation = msg.includes('23503') || msg.toLowerCase().includes('foreign key');
    logRedacted('error', '[admin] deleteBrand error:', msg);
    return {
      error: isFkViolation
        ? 'No se puede eliminar esta marca porque tiene campañas vinculadas. Archiva o elimina primero las campañas.'
        : 'Error al eliminar la marca',
    };
  }
}

export async function createContactAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');

  const parsed = createBrandContactSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  try {
    await assertCanEditBrand(parsed.data.brandId, {
      userId: session.user.id,
      role: session.user.role,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    if (msg.startsWith('forbidden:')) return { error: 'Sin permiso para modificar esta marca' };
    logRedacted('error', '[admin] createContact permission error:', msg);
    return { error: 'Error al verificar permisos' };
  }

  try {
    const row = await createBrandContact(
      nullify(parsed.data) as Parameters<typeof createBrandContact>[0],
    );
    revalidatePath('/admin/brands');
    revalidatePath(`/admin/brands/${parsed.data.brandId}`);
    return { success: true, id: row.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    logRedacted('error', '[admin] createContact error:', msg);
    return { error: 'Error al crear el contacto' };
  }
}

export async function updateContactAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');

  const parsed = updateBrandContactSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const { id, ...rest } = parsed.data;

  if (rest.brandId) {
    try {
      await assertCanEditBrand(rest.brandId, {
        userId: session.user.id,
        role: session.user.role,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      if (msg.startsWith('forbidden:')) return { error: 'Sin permiso para modificar esta marca' };
      logRedacted('error', '[admin] updateContact permission error:', msg);
      return { error: 'Error al verificar permisos' };
    }
  }

  try {
    await updateBrandContact(
      id,
      compact(rest) as Partial<Parameters<typeof updateBrandContact>[1]>,
    );
    revalidatePath('/admin/brands');
    if (rest.brandId) revalidatePath(`/admin/brands/${rest.brandId}`);
    return { success: true, id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    logRedacted('error', '[admin] updateContact error:', msg);
    return { error: 'Error al actualizar el contacto' };
  }
}

export async function deleteContactAction(id: number, brandId: number): Promise<ActionState> {
  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');

  try {
    await assertCanEditBrand(brandId, {
      userId: session.user.id,
      role: session.user.role,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    if (msg.startsWith('forbidden:')) return { error: 'Sin permiso para modificar esta marca' };
    logRedacted('error', '[admin] deleteContact permission error:', msg);
    return { error: 'Error al verificar permisos' };
  }

  try {
    await deleteBrandContact(id);
    revalidatePath('/admin/brands');
    revalidatePath(`/admin/brands/${brandId}`);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    logRedacted('error', '[admin] deleteContact error:', msg);
    return { error: 'Error al eliminar el contacto' };
  }
}

// ── Follow-up actions ─────────────────────────────────────────────────────────

export async function createFollowupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');

  const parsed = createFollowupSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  try {
    await assertCanEditBrand(parsed.data.brandId, {
      userId: session.user.id,
      role: session.user.role,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    if (msg.startsWith('forbidden:')) return { error: 'Sin permiso para modificar esta marca' };
    logRedacted('error', '[admin] createFollowup permission error:', msg);
    return { error: 'Error al verificar permisos' };
  }

  try {
    const row = await createBrandFollowup({
      brandId: parsed.data.brandId,
      createdByUserId: session.user.id,
      scheduledAt: new Date(parsed.data.scheduledAt),
      note: parsed.data.note ?? '',
      channel: parsed.data.channel,
      summary: parsed.data.summary,
      nextAction: parsed.data.nextAction,
      nextActionAt: parsed.data.nextActionAt ? new Date(parsed.data.nextActionAt) : undefined,
      status: parsed.data.status,
      assignedToUserId: parsed.data.assignedToUserId,
      responsibleUserId: parsed.data.responsibleUserId,
    });
    revalidatePath('/admin/brands');
    return { success: true, id: row.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    logRedacted('error', '[admin] createFollowup error:', msg);
    return { error: 'Error al crear el seguimiento' };
  }
}

export async function updateFollowupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');

  const parsed = updateFollowupSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const { id, brandId, scheduledAt, nextActionAt, ...rest } = parsed.data;
  const patchData = {
    ...rest,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    nextActionAt: parseOptionalDate(nextActionAt),
  };

  if (brandId !== undefined) {
    try {
      await assertCanEditBrand(brandId, {
        userId: session.user.id,
        role: session.user.role,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      if (msg.startsWith('forbidden:')) return { error: 'Sin permiso para modificar esta marca' };
      logRedacted('error', '[admin] updateFollowup permission error:', msg);
      return { error: 'Error al verificar permisos' };
    }
  }

  try {
    await updateBrandFollowup(id, compact(patchData) as Partial<Parameters<typeof updateBrandFollowup>[1]>);
    revalidatePath('/admin/brands');
    if (brandId !== undefined) revalidatePath(`/admin/brands/${brandId}`);
    return { success: true, id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    logRedacted('error', '[admin] updateFollowup error:', msg);
    return { error: 'Error al actualizar el seguimiento' };
  }
}

export async function completeFollowupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');

  const parsed = completeFollowupSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: 'Datos inválidos' };

  try {
    await assertCanEditBrand(parsed.data.brandId, {
      userId: session.user.id,
      role: session.user.role,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    if (msg.startsWith('forbidden:')) return { error: 'Sin permiso para modificar esta marca' };
    logRedacted('error', '[admin] completeFollowup permission error:', msg);
    return { error: 'Error al verificar permisos' };
  }

  try {
    await completeBrandFollowup(parsed.data.id);
    revalidatePath('/admin/brands');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    logRedacted('error', '[admin] completeFollowup error:', msg);
    return { error: 'Error al completar el seguimiento' };
  }
}

export async function deleteFollowupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');

  const parsed = deleteFollowupSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: 'Datos inválidos' };

  try {
    assertCanDelete(session.user.role);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    if (msg.startsWith('forbidden:delete:')) return { error: msg };
    logRedacted('error', '[admin] deleteFollowup permission error:', msg);
    return { error: 'Sin permiso para eliminar seguimientos' };
  }

  try {
    await assertCanEditBrand(parsed.data.brandId, {
      userId: session.user.id,
      role: session.user.role,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    if (msg.startsWith('forbidden:')) return { error: 'Sin permiso para modificar esta marca' };
    logRedacted('error', '[admin] deleteFollowup ownership error:', msg);
    return { error: 'Error al verificar permisos' };
  }

  try {
    await deleteBrandFollowup(parsed.data.id);
    revalidatePath('/admin/brands');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    logRedacted('error', '[admin] deleteFollowup error:', msg);
    return { error: 'Error al eliminar el seguimiento' };
  }
}
