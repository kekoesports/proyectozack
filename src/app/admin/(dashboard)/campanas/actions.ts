'use server';

import { revalidatePath } from 'next/cache';

import { requireAnyRole } from '@/lib/auth-guard';
import { assertCanDelete } from '@/lib/permissions';
import { createCampaignSchema, updateCampaignSchema } from '@/lib/schemas/campaign';
import {
  createCampaign,
  updateCampaign,
  archiveCampaign,
  unarchiveCampaign,
  assertCanEditCampaign,
} from '@/lib/queries/campaigns';

import type { Role } from '@/lib/auth-guard';
import type { CreateCampaignInput } from '@/lib/queries/campaigns';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip keys whose value is undefined — required for exactOptionalPropertyTypes. */
function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

// ── createCampaignAction ──────────────────────────────────────────────────────

export async function createCampaignAction(
  formData: FormData,
): Promise<{ success: true; id: number } | { success: false; error: string }> {
  try {
    const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');

    const raw = Object.fromEntries(formData);
    const parsed = createCampaignSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
    }

    const input = compact({
      ...parsed.data,
      createdByUserId: session.user.id,
    }) as CreateCampaignInput;

    const campaign = await createCampaign(input);

    revalidatePath('/admin/campanas');
    return { success: true, id: campaign.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[createCampaignAction] error:', msg);
    return { success: false, error: msg !== 'unknown' ? msg : 'Error al crear campaña' };
  }
}

// ── updateCampaignAction ──────────────────────────────────────────────────────

export async function updateCampaignAction(
  formData: FormData,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');

    const raw = Object.fromEntries(formData);
    const parsed = updateCampaignSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
    }

    const { id, ...rest } = parsed.data;

    await assertCanEditCampaign(id, { userId: session.user.id, role: session.user.role as Role });

    await updateCampaign(id, compact(rest) as Partial<CreateCampaignInput>);

    revalidatePath('/admin/campanas');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[updateCampaignAction] error:', msg);
    return { success: false, error: msg !== 'unknown' ? msg : 'Error al actualizar campaña' };
  }
}

// ── archiveCampaignAction (soft delete — decisión #4) ────────────────────────

export async function archiveCampaignAction(
  id: number,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');

    // decisión #1: manager NO puede archivar
    assertCanDelete(session.user.role as Role);

    await assertCanEditCampaign(id, { userId: session.user.id, role: session.user.role as Role });

    await archiveCampaign(id);

    revalidatePath('/admin/campanas');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[archiveCampaignAction] error:', msg);
    return { success: false, error: msg !== 'unknown' ? msg : 'Error al archivar campaña' };
  }
}

// ── unarchiveCampaignAction ───────────────────────────────────────────────────

export async function unarchiveCampaignAction(
  id: number,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');

    // solo admin puede desarchivar
    assertCanDelete(session.user.role as Role);

    await unarchiveCampaign(id);

    revalidatePath('/admin/campanas');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[unarchiveCampaignAction] error:', msg);
    return { success: false, error: msg !== 'unknown' ? msg : 'Error al desarchivar campaña' };
  }
}

// NO hay deleteCampaignAction (decisión #4 — soft delete)
// NO hay markBrandPaidAction / markTalentPaidAction (decisión #5 — derivado desde invoices)
