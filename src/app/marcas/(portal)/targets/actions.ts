'use server';

import { revalidatePath } from 'next/cache';

import { requireRole } from '@/lib/auth-guard';
import { parseFormData } from '@/lib/forms/parseFormData';
import { firstError } from '@/lib/forms/firstError';
import { logRedacted } from '@/lib/log';
import { updateBrandTargetStatus, updateBrandTargetNotes } from '@/lib/queries/targets';
import {
  updateBrandTargetStatusSchema,
  updateBrandTargetNotesSchema,
} from '@/lib/schemas/target';

export async function updateBrandTargetStatusAction(formData: FormData): Promise<void> {
  const session = await requireRole('brand', '/marcas/login');

  const parsed = parseFormData(formData, updateBrandTargetStatusSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[marcas/targets] updateBrandTargetStatusAction validation failed:', firstError(parsed.fieldErrors));
    return;
  }

  await updateBrandTargetStatus(session.user.id, parsed.data.targetId, parsed.data.status);
  revalidatePath('/marcas/targets');
}

export async function updateBrandTargetNotesAction(formData: FormData): Promise<void> {
  const session = await requireRole('brand', '/marcas/login');

  const parsed = parseFormData(formData, updateBrandTargetNotesSchema);
  if (!parsed.ok) {
    logRedacted('warn', '[marcas/targets] updateBrandTargetNotesAction validation failed:', firstError(parsed.fieldErrors));
    return;
  }

  await updateBrandTargetNotes(session.user.id, parsed.data.targetId, parsed.data.notes);
  revalidatePath('/marcas/targets');
}
