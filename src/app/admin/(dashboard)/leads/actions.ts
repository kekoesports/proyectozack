'use server';

import { revalidatePath } from 'next/cache';

import { sendLeadReplyEmail } from '@/lib/email/leadReply';
import { requirePermission } from '@/lib/permissions';
import {
  addLeadNote,
  assignLead,
  getLeadById,
  recordLeadEmailSent,
  updateLeadStatus,
} from '@/lib/queries/leads';
import {
  addLeadNoteSchema,
  assignLeadSchema,
  sendLeadReplySchema,
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

export async function sendLeadReplyAction(input: unknown): Promise<LeadActionResult> {
  const session = await requirePermission('leads', 'write');
  const parsed = sendLeadReplySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Revisa el asunto y el mensaje' };

  try {
    const lead = await getLeadById(parsed.data.id);
    if (!lead) return { ok: false, error: 'El lead ya no existe' };

    const providerEmailId = await sendLeadReplyEmail({
      to: lead.email,
      subject: parsed.data.subject,
      body: parsed.data.body,
      idempotencyKey: parsed.data.idempotencyKey,
    });
    await recordLeadEmailSent({
      id: lead.id,
      subject: parsed.data.subject,
      providerEmailId,
      userId: session.user.id,
    });
  } catch (err) {
    logRedacted('error', '[admin/leads] sendLeadReply error:', err);
    return {
      ok: false,
      error: 'No se pudo enviar el email. El lead no se ha marcado como contactado.',
    };
  }

  revalidateLead(parsed.data.id);
  return { ok: true };
}
