'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { requireRole } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { campaigns } from '@/db/schema';

type ActionResult = { readonly success: true } | { readonly success: false; readonly error: string };

/**
 * Toggles the CNMC compliance checklist for a campaign.
 * Only admin can toggle — managers get a permission error.
 */
export async function toggleCampaignCnmcChecklistAction(
  campaignId: number,
  ok: boolean,
): Promise<ActionResult> {
  await requireRole('admin', '/admin/login');

  try {
    await db
      .update(campaigns)
      .set({
        cnmcChecklistOk: ok,
        cnmcChecklistAt: ok ? new Date() : null,
      })
      .where(eq(campaigns.id, campaignId));

    revalidatePath(`/admin/campanas/${campaignId}`);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[admin] toggleCampaignCnmcChecklist error:', msg);
    return { success: false, error: 'Error al actualizar el checklist' };
  }
}
