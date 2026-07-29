'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/permissions';
import { createWinner, deleteWinner } from '@/lib/queries/giveawayWinners';
import { parseFormData } from '@/lib/forms/parseFormData';
import { firstError } from '@/lib/forms/firstError';
import { logRedacted } from '@/lib/log';
import { logGiveawayEvent } from '@/lib/audit/logGiveawayEvent';
import {
  CreateWinnerFormSchema,
  DeleteByIdSchema,
} from '@/lib/schemas/giveaway';

export type WinnerActionState =
  | { ok: true }
  | { ok: false; fieldErrors: Record<string, string[]> };

export async function createWinnerAction(formData: FormData): Promise<WinnerActionState> {
  const { user } = await requirePermission('sorteos', 'publish');

  const parsed = parseFormData(formData, CreateWinnerFormSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[createWinnerAction] validation failed:', firstError(parsed.fieldErrors));
    return { ok: false, fieldErrors: parsed.fieldErrors };
  }

  try {
    await createWinner({
      giveawayId: parsed.data.giveawayId,
      winnerName: parsed.data.winnerName,
      winnerAvatar: parsed.data.winnerAvatar,
    });
  } catch {
    return { ok: false, fieldErrors: { giveawayId: ['Este sorteo ya tiene ganador'] } };
  }
  await logGiveawayEvent({
    userId: user.id,
    action: 'raffle_winner_registered',
    outcome: 'success',
    refType: 'giveaway',
    refId: parsed.data.giveawayId,
  });
  revalidatePath('/admin/giveaways');
  revalidatePath('/codigos');
  return { ok: true };
}

export async function deleteWinnerAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission('sorteos', 'delete');
  const parsed = parseFormData(formData, DeleteByIdSchema);
  if (!parsed.ok) return;
  await deleteWinner(parsed.data.id);
  await logGiveawayEvent({
    userId: user.id,
    action: 'raffle_winner_deleted',
    outcome: 'success',
    refType: 'giveaway_winner',
    refId: parsed.data.id,
  });
  revalidatePath('/admin/giveaways');
  revalidatePath('/codigos');
}
