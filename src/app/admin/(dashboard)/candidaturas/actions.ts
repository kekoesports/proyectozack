'use server';

import { revalidatePath } from 'next/cache';

import { CreatorOutreachError, sendCreatorOutreach } from '@/lib/email/creatorOutreach';
import {
  creatorOutreachMessageFor,
  qualifyCreatorApplication,
} from '@/lib/email/creatorOutreachAutomation';
import { logRedacted } from '@/lib/log';
import { requirePermission } from '@/lib/permissions';
import {
  getCreatorApplicationReview,
  toInboundCreatorApplication,
} from '@/lib/queries/creatorApplicationReviews';
import {
  appendCreatorOutreachNote,
  discardCreatorOutreachReview,
  recordCreatorOutreachQualification,
} from '@/lib/queries/creatorOutreach';
import {
  addCreatorReviewNoteSchema,
  discardCreatorReviewSchema,
  refreshCreatorReviewSchema,
  sendCreatorReviewDecisionSchema,
} from '@/lib/schemas/creator-outreach';

export type CreatorReviewActionResult = { readonly ok: true; readonly message: string }
  | { readonly ok: false; readonly error: string };

const LIST_PATH = '/admin/candidaturas';

function revalidateReview(sourceType: string, sourceId: number): void {
  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${sourceType}/${sourceId}`);
}

export async function refreshCreatorReviewAction(input: unknown): Promise<CreatorReviewActionResult> {
  await requirePermission('leads', 'write');
  const parsed = refreshCreatorReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Candidatura inválida' };
  try {
    const item = await getCreatorApplicationReview(parsed.data.sourceType, parsed.data.sourceId);
    if (!item) return { ok: false, error: 'La candidatura ya no existe' };
    const qualification = await qualifyCreatorApplication(toInboundCreatorApplication(item));
    await recordCreatorOutreachQualification({ ...parsed.data, ...qualification });
    revalidateReview(parsed.data.sourceType, parsed.data.sourceId);
    return { ok: true, message: 'Perfil revisado y semáforo actualizado.' };
  } catch (error) {
    logRedacted('error', '[admin/candidaturas] refresh error:', error);
    return { ok: false, error: 'No se pudo verificar el perfil ahora mismo. No se ha enviado ningún email.' };
  }
}

export async function addCreatorReviewNoteAction(input: unknown): Promise<CreatorReviewActionResult> {
  const session = await requirePermission('leads', 'write');
  const parsed = addCreatorReviewNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'La nota no puede estar vacía' };
  try {
    await appendCreatorOutreachNote({
      ...parsed.data,
      actorLabel: session.user.name || session.user.email,
    });
    revalidateReview(parsed.data.sourceType, parsed.data.sourceId);
    return { ok: true, message: 'Nota guardada.' };
  } catch (error) {
    logRedacted('error', '[admin/candidaturas] note error:', error);
    return { ok: false, error: 'No se pudo guardar la nota' };
  }
}

export async function discardCreatorReviewAction(input: unknown): Promise<CreatorReviewActionResult> {
  const session = await requirePermission('leads', 'write');
  const parsed = discardCreatorReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Candidatura inválida' };
  try {
    await appendCreatorOutreachNote({
      ...parsed.data,
      note: 'Candidatura descartada sin enviar email.',
      actorLabel: session.user.name || session.user.email,
    });
    await discardCreatorOutreachReview(parsed.data.sourceType, parsed.data.sourceId);
    revalidateReview(parsed.data.sourceType, parsed.data.sourceId);
    return { ok: true, message: 'Candidatura descartada. No se ha enviado ningún email.' };
  } catch (error) {
    logRedacted('error', '[admin/candidaturas] discard error:', error);
    return { ok: false, error: 'No se pudo descartar la candidatura' };
  }
}

export async function sendCreatorReviewDecisionAction(input: unknown): Promise<CreatorReviewActionResult> {
  const session = await requirePermission('leads', 'write');
  const parsed = sendCreatorReviewDecisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Acción inválida' };
  try {
    const item = await getCreatorApplicationReview(parsed.data.sourceType, parsed.data.sourceId);
    if (!item) return { ok: false, error: 'La candidatura ya no existe' };
    const application = toInboundCreatorApplication(item);
    const content = creatorOutreachMessageFor(application, parsed.data.decision);
    await recordCreatorOutreachQualification({
      sourceType: parsed.data.sourceType,
      sourceId: parsed.data.sourceId,
      decision: parsed.data.decision,
      reason: parsed.data.decision === 'green'
        ? 'Aprobado manualmente por el equipo.'
        : 'Respuesta de no encaje aprobada manualmente por el equipo.',
    });
    const result = await sendCreatorOutreach({
      sourceType: parsed.data.sourceType,
      sourceId: parsed.data.sourceId,
      idempotencyKey: parsed.data.idempotencyKey,
      ...content,
    }, session.user.id);
    revalidateReview(parsed.data.sourceType, parsed.data.sourceId);
    return {
      ok: true,
      message: result.duplicate ? 'Este mismo envío ya estaba registrado.' : 'Email enviado y registrado en el historial.',
    };
  } catch (error) {
    logRedacted('error', '[admin/candidaturas] send decision error:', error);
    if (error instanceof CreatorOutreachError && error.code === 'suppressed') {
      return { ok: false, error: 'La dirección está dada de baja o suprimida.' };
    }
    return { ok: false, error: 'No se pudo enviar el email. La candidatura no se ha marcado como contactada.' };
  }
}
