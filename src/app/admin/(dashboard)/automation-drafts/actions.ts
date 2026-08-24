'use server';

import { revalidatePath } from 'next/cache';

import {
  getAutomationDealValidationIssues,
  type AutomationDealValidationIssue,
} from '@/lib/automationDealValidation';
import { logRedacted } from '@/lib/log';
import { requirePermission } from '@/lib/permissions';
import {
  AutomationDealDraftError,
  getAutomationDealDraft,
  reviewAutomationDealDraft,
} from '@/lib/queries/automationDealDrafts';
import {
  buildAutomationDealProposal,
  updateDraftFromEditorSchema,
} from '@/lib/schemas/automationDealDraftEditor';
import { reviewDraftSchema } from '@/lib/schemas/automationDealDraftReview';

export type DraftActionResult =
  | {
      readonly ok: true;
      readonly status: string;
      readonly campaignId?: number;
      readonly validationIssues?: readonly AutomationDealValidationIssue[];
    }
  | { readonly ok: false; readonly error: string };

const LIST_PATH = '/admin/automation-drafts';

function revalidateDraft(id: number): void {
  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${id}`);
  // Aprobar crea una campaña real: el listado de tratos también queda obsoleto.
  revalidatePath('/admin/campanas');
}

/**
 * Traduce los errores de dominio a algo que el operador entienda.
 * `reviewAutomationDealDraft` lanza `draft-<estado>` cuando la transición no aplica.
 */
function friendlyError(message: string): string {
  switch (message) {
    case 'draft-missing_info':
      return 'Faltan datos obligatorios. Corrige los campos marcados en esta ficha.';
    case 'draft-rejected':
      return 'Este borrador ya estaba rechazado.';
    case 'draft-created':
      return 'Este borrador ya generó un trato.';
    case 'draft-payload-invalid':
      return 'La propuesta guardada no es válida. Corrige los campos marcados en esta ficha.';
    default:
      return 'No se pudo completar la revisión.';
  }
}

export async function updateDraftAction(input: unknown): Promise<DraftActionResult> {
  const session = await requirePermission('campanas', 'write');
  const parsed = updateDraftFromEditorSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Revisa los campos marcados antes de guardar' };

  try {
    const current = await getAutomationDealDraft(parsed.data.id);
    if (!current) return { ok: false, error: 'El borrador ya no existe' };
    const proposedDeal = buildAutomationDealProposal(parsed.data.deal, current.proposedDeal);
    const result = await reviewAutomationDealDraft({
      id: parsed.data.id,
      action: 'update',
      proposedDeal,
      reviewedBy: session.user.email,
    });
    if (!result) return { ok: false, error: 'El borrador ya no existe' };
    revalidateDraft(parsed.data.id);
    return {
      ok: true,
      status: result.status,
      validationIssues: getAutomationDealValidationIssues(proposedDeal),
    };
  } catch (err) {
    if (err instanceof AutomationDealDraftError) {
      return { ok: false, error: friendlyError(err.message) };
    }
    logRedacted('error', '[admin/automation-drafts] update error:', err);
    return { ok: false, error: 'No se pudieron guardar los cambios' };
  }
}

export async function approveDraftAction(input: unknown): Promise<DraftActionResult> {
  const session = await requirePermission('campanas', 'write');
  const parsed = reviewDraftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };

  try {
    const result = await reviewAutomationDealDraft({
      id: parsed.data.id,
      action: 'approve',
      reviewedBy: session.user.email,
    });
    if (!result) return { ok: false, error: 'El borrador ya no existe' };
    revalidateDraft(parsed.data.id);
    return {
      ok: true,
      status: result.status,
      ...(result.progress ? { campaignId: result.progress.campaignId } : {}),
    };
  } catch (err) {
    if (err instanceof AutomationDealDraftError) {
      return { ok: false, error: friendlyError(err.message) };
    }
    logRedacted('error', '[admin/automation-drafts] approve error:', err);
    return { ok: false, error: 'No se pudo aprobar el borrador' };
  }
}

export async function rejectDraftAction(input: unknown): Promise<DraftActionResult> {
  const session = await requirePermission('campanas', 'write');
  const parsed = reviewDraftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };

  try {
    const result = await reviewAutomationDealDraft({
      id: parsed.data.id,
      action: 'reject',
      reviewedBy: session.user.email,
    });
    if (!result) return { ok: false, error: 'El borrador ya no existe' };
    revalidateDraft(parsed.data.id);
    return { ok: true, status: result.status };
  } catch (err) {
    if (err instanceof AutomationDealDraftError) {
      return { ok: false, error: friendlyError(err.message) };
    }
    logRedacted('error', '[admin/automation-drafts] reject error:', err);
    return { ok: false, error: 'No se pudo rechazar el borrador' };
  }
}
