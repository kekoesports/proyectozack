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

import { compact } from '@/lib/utils/objects';

import { logRedacted } from '@/lib/log';
import { parseFormData } from '@/lib/forms/parseFormData';
import { firstError } from '@/lib/forms/firstError';

import type { CreateCampaignInput } from '@/lib/queries/campaigns';

// ── createCampaignAction ──────────────────────────────────────────────────────

export async function createCampaignAction(
  formData: FormData,
): Promise<{ success: true; id: number } | { success: false; error: string }> {
  try {
    const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');

    const parsed = parseFormData(formData, createCampaignSchema);
    if (!parsed.ok) return { success: false, error: firstError(parsed.fieldErrors) };

    const input = compact({
      ...parsed.data,
      createdByUserId: session.user.id,
    }) as CreateCampaignInput;

    const campaign = await createCampaign(input);

    revalidatePath('/admin/campanas');
    return { success: true, id: campaign.id };
  } catch (err) {
    logRedacted('error', '[createCampaignAction] error:', err);
    const msg = err instanceof Error ? err.message : 'unknown';
    return { success: false, error: msg !== 'unknown' ? msg : 'Error al crear campaña' };
  }
}

// ── updateCampaignAction ──────────────────────────────────────────────────────

export async function updateCampaignAction(
  formData: FormData,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');

    const parsed = parseFormData(formData, updateCampaignSchema);
    if (!parsed.ok) return { success: false, error: firstError(parsed.fieldErrors) };

    const { id, ...rest } = parsed.data;

    await assertCanEditCampaign(id, { userId: session.user.id, role: session.user.role });

    await updateCampaign(id, compact(rest) as Partial<CreateCampaignInput>);

    revalidatePath('/admin/campanas');
    return { success: true };
  } catch (err) {
    logRedacted('error', '[updateCampaignAction] error:', err);
    const msg = err instanceof Error ? err.message : 'unknown';
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
    assertCanDelete(session.user.role);

    await assertCanEditCampaign(id, { userId: session.user.id, role: session.user.role });

    await archiveCampaign(id);

    revalidatePath('/admin/campanas');
    return { success: true };
  } catch (err) {
    logRedacted('error', '[archiveCampaignAction] error:', err);
    const msg = err instanceof Error ? err.message : 'unknown';
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
    assertCanDelete(session.user.role);

    await unarchiveCampaign(id);

    revalidatePath('/admin/campanas');
    return { success: true };
  } catch (err) {
    logRedacted('error', '[unarchiveCampaignAction] error:', err);
    const msg = err instanceof Error ? err.message : 'unknown';
    return { success: false, error: msg !== 'unknown' ? msg : 'Error al desarchivar campaña' };
  }
}

// NO hay deleteCampaignAction (decisión #4 — soft delete)
// NO hay markBrandPaidAction / markTalentPaidAction (decisión #5 — derivado desde invoices)
