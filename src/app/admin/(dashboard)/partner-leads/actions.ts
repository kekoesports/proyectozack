'use server';

import { revalidatePath } from 'next/cache';

import { requirePermission } from '@/lib/permissions';
import {
  updatePartnerLeadNotes,
  updatePartnerLeadOutreachStatus,
} from '@/lib/queries/partnerLeads';
import {
  PartnerLeadNotesUpdate,
  PartnerLeadStatusUpdate,
} from '@/lib/schemas/partnerLead';
import type { PartnerLeadOutreachStatus } from '@/types';

type ActionResult = { readonly ok: true } | { readonly ok: false; readonly error: string };

export async function updatePartnerLeadStatusAction(input: {
  readonly id: number;
  readonly status: PartnerLeadOutreachStatus;
}): Promise<ActionResult> {
  const session = await requirePermission('leads', 'write');
  const parsed = PartnerLeadStatusUpdate.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Input inválido' };

  await updatePartnerLeadOutreachStatus(parsed.data.id, parsed.data.status, session.user.id);
  revalidatePath('/admin/partner-leads');
  return { ok: true };
}

export async function updatePartnerLeadNotesAction(input: {
  readonly id: number;
  readonly notes: string;
}): Promise<ActionResult> {
  await requirePermission('leads', 'write');
  const parsed = PartnerLeadNotesUpdate.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Input inválido' };

  await updatePartnerLeadNotes(parsed.data.id, parsed.data.notes);
  revalidatePath('/admin/partner-leads');
  return { ok: true };
}
