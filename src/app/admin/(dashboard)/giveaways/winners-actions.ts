'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/permissions';
import { createWinner, deleteWinner } from '@/lib/queries/giveawayWinners';
import { parseFormData } from '@/lib/forms/parseFormData';
import { firstError } from '@/lib/forms/firstError';
import { logRedacted } from '@/lib/log';
import {
  CreateWinnerFormSchema,
  DeleteByIdSchema,
} from '@/lib/schemas/giveaway';

export type WinnerActionState =
  | { ok: true }
  | { ok: false; fieldErrors: Record<string, string[]> };

export async function createWinnerAction(formData: FormData): Promise<WinnerActionState> {
  await requirePermission('sorteos', 'write');

  const parsed = parseFormData(formData, CreateWinnerFormSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[createWinnerAction] validation failed:', firstError(parsed.fieldErrors));
    return { ok: false, fieldErrors: parsed.fieldErrors };
  }

  await createWinner({
    giveawayId: parsed.data.giveawayId,
    winnerName: parsed.data.winnerName,
    winnerAvatar: parsed.data.winnerAvatar,
  });
  revalidatePath('/admin/giveaways');
  revalidatePath('/giveaways');
  return { ok: true };
}

export async function deleteWinnerAction(formData: FormData): Promise<void> {
  await requirePermission('sorteos', 'write');
  const parsed = parseFormData(formData, DeleteByIdSchema);
  if (!parsed.ok) return;
  await deleteWinner(parsed.data.id);
  revalidatePath('/admin/giveaways');
  revalidatePath('/giveaways');
}
