'use server';

import { revalidatePath } from 'next/cache';

import { requirePermission } from '@/lib/permissions';
import { addLeadNote, assignLead, updateLeadStatus } from '@/lib/queries/leads';
import {
  addLeadNoteSchema,
  assignLeadSchema,
  updateLeadStatusSchema,
} from '@/lib/schemas/lead';
import { logRedacted } from '@/lib/log';

export type LeadActionResult = { readonly ok: true } | { readonly ok: false; readonly error: string };

const LIST_PATH = '/admin/leads';

function revalidateLead(id: number): void {
  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${id}`);
}

export async function updateLeadStatusAction(input: unknown): Promise<LeadActionResult> {
  const session = await requirePermission('leads', 'write');
  const parsed = updateLeadStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };

  try {
    await updateLeadStatus(parsed.data.id, parsed.data.status, session.user.id);
  } catch (err) {
    logRedacted('error', '[admin/leads] updateLeadStatus error:', err);
    return { ok: false, error: 'No se pudo cambiar el estado' };
  }

  revalidateLead(parsed.data.id);
  return { ok: true };
}

export async function assignLeadAction(input: unknown): Promise<LeadActionResult> {
  await requirePermission('leads', 'write');
  const parsed = assignLeadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };

  try {
    await assignLead(parsed.data.id, parsed.data.assignedToId || null);
  } catch (err) {
    logRedacted('error', '[admin/leads] assignLead error:', err);
    return { ok: false, error: 'No se pudo asignar el lead' };
  }

  revalidateLead(parsed.data.id);
  return { ok: true };
}

export async function addLeadNoteAction(input: unknown): Promise<LeadActionResult> {
  const session = await requirePermission('leads', 'write');
  const parsed = addLeadNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'La nota no puede estar vacía' };

  try {
    await addLeadNote(parsed.data.id, parsed.data.note, session.user.id);
  } catch (err) {
    logRedacted('error', '[admin/leads] addLeadNote error:', err);
    return { ok: false, error: 'No se pudo guardar la nota' };
  }

  revalidateLead(parsed.data.id);
  return { ok: true };
}
