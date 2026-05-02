'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAnyRole } from '@/lib/auth-guard';
import { pressTargetOutreachStatusEnum } from '@/db/schema';
import {
  updatePressTargetOutreachStatus,
  updatePressTargetNotes,
} from '@/lib/queries/pressTargets';
import type { PressTargetOutreachStatus } from '@/types';

const StatusSchema = z.enum(pressTargetOutreachStatusEnum.enumValues);

const UpdateStatusInput = z.object({
  id: z.number().int().positive(),
  status: StatusSchema,
});

const UpdateNotesInput = z.object({
  id: z.number().int().positive(),
  notes: z.string().max(2000),
});

type ActionResult = { ok: true } | { ok: false; error: string };

export async function updatePressTargetStatusAction(
  input: { id: number; status: PressTargetOutreachStatus },
): Promise<ActionResult> {
  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');
  const parsed = UpdateStatusInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Input inválido' };

  await updatePressTargetOutreachStatus(parsed.data.id, parsed.data.status, session.user.id);
  revalidatePath('/admin/prensa-targets');
  return { ok: true };
}

export async function updatePressTargetNotesAction(
  input: { id: number; notes: string },
): Promise<ActionResult> {
  await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');
  const parsed = UpdateNotesInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Input inválido' };

  await updatePressTargetNotes(parsed.data.id, parsed.data.notes);
  revalidatePath('/admin/prensa-targets');
  return { ok: true };
}
