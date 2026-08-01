'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requirePermission } from '@/lib/permissions';
import {
  cancelRedemptionAtomically,
  completeRedemptionAtomically,
} from '@/lib/giveaway-platform/atomicOperations';
import { logGiveawayEvent } from '@/lib/audit/logGiveawayEvent';

const RedemptionOperationSchema = z.object({
  redemptionId: z.coerce.number().int().positive(),
  notes: z.string().trim().max(2_000).optional(),
});

async function parseOperation(formData: FormData) {
  return RedemptionOperationSchema.safeParse({
    redemptionId: formData.get('redemptionId'),
    notes: formData.get('notes') || undefined,
  });
}

export async function markRedemptionSentAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission('sorteos', 'publish');
  const parsed = await parseOperation(formData);
  if (!parsed.success) return;

  const changed = await completeRedemptionAtomically({
    redemptionId: parsed.data.redemptionId,
    adminUserId: user.id,
    adminNotes: parsed.data.notes ?? null,
  });
  if (changed) {
    await logGiveawayEvent({
      userId: user.id,
      action: 'redemption_sent',
      outcome: 'success',
      refType: 'redemption',
      refId: parsed.data.redemptionId,
    });
  }
  revalidatePath('/admin/giveaways/redemptions');
}

export async function cancelRedemptionAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission('sorteos', 'publish');
  const parsed = await parseOperation(formData);
  if (!parsed.success) return;

  const changed = await cancelRedemptionAtomically({
    redemptionId: parsed.data.redemptionId,
    adminUserId: user.id,
    adminNotes: parsed.data.notes ?? null,
  });
  if (changed) {
    await logGiveawayEvent({
      userId: user.id,
      action: 'redemption_cancelled',
      outcome: 'success',
      refType: 'redemption',
      refId: parsed.data.redemptionId,
    });
  }
  revalidatePath('/admin/giveaways/redemptions');
}
