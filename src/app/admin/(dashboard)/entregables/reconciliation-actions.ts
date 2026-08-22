'use server';

import { revalidatePath } from 'next/cache';

import { requirePermission } from '@/lib/permissions';
import {
  classifyUnlinkedTracker,
  linkTrackerToCampaign,
} from '@/lib/queries/tracker-reconciliation';
import {
  classifyUnlinkedTrackerSchema,
  linkTrackerToCampaignSchema,
} from '@/lib/schemas/tracker-reconciliation';

type ActionResult = { ok: true } | { ok: false; error: string };

function revalidateReconciliation(): void {
  revalidatePath('/admin/entregables/reconciliar');
  revalidatePath('/admin/entregables');
}

export async function linkTrackerToCampaignAction(formData: FormData): Promise<ActionResult> {
  const session = await requirePermission('campanas', 'write');
  const parsed = linkTrackerToCampaignSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  const result = await linkTrackerToCampaign({
    trackerId: parsed.data.trackerId,
    campaignId: parsed.data.campaignId,
    ...(parsed.data.note ? { note: parsed.data.note } : {}),
    session: { userId: session.user.id, role: session.user.role },
  });
  if (result.ok) revalidateReconciliation();
  return result;
}

export async function classifyUnlinkedTrackerAction(formData: FormData): Promise<ActionResult> {
  const session = await requirePermission('campanas', 'write');
  const parsed = classifyUnlinkedTrackerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  const result = await classifyUnlinkedTracker({
    trackerId: parsed.data.trackerId,
    status: parsed.data.status,
    ...(parsed.data.note ? { note: parsed.data.note } : {}),
    session: { userId: session.user.id, role: session.user.role },
  });
  if (result.ok) revalidateReconciliation();
  return result;
}
