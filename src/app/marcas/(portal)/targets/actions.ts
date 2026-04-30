'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth-guard';
import { updateBrandTargetStatus, updateBrandTargetNotes } from '@/lib/queries/targets';
import type { Target } from '@/types';

export async function updateBrandTargetStatusAction(formData: FormData): Promise<void> {
  const session = await requireRole('brand', '/marcas/login');

  const targetId = Number(formData.get('targetId'));
  const status   = formData.get('status') as Target['status'];

  if (!targetId || !status) return;

  await updateBrandTargetStatus(session.user.id, targetId, status);
  revalidatePath('/marcas/targets');
}

export async function updateBrandTargetNotesAction(formData: FormData): Promise<void> {
  const session = await requireRole('brand', '/marcas/login');

  const targetId = Number(formData.get('targetId'));
  const notes    = (formData.get('notes') as string | null) ?? '';

  if (!targetId) return;

  await updateBrandTargetNotes(session.user.id, targetId, notes);
  revalidatePath('/marcas/targets');
}
