'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/permissions';
import { logRedacted } from '@/lib/log';
import {
  approveMatchFromCandidateSchema,
  rejectMatchFromCandidateSchema,
} from '@/lib/schemas/bankReconciliation';
import {
  approveMatchFromCandidate,
  rejectMatchFromCandidate,
  updateBankTransactionStatus,
  logReconciliationEvent,
} from '@/lib/queries/bankReconciliation';

type ActionState = {
  readonly error?: string;
  readonly success?: boolean;
};

const RECON_PATH = '/admin/facturacion/bancos/conciliacion';

export async function approveMatchAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requirePermission('bancos', 'write');
    const parsed = approveMatchFromCandidateSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: 'Datos inválidos' };

    const { transactionId, matchType, matchedEntityId, confidence, matchReason } = parsed.data;

    const match = await approveMatchFromCandidate({
      transactionId,
      matchType,
      matchedEntityId,
      confidence,
      matchReason,
      approvedByUserId: session.user.id,
    });

    await logReconciliationEvent({
      transactionId,
      matchId: match.id,
      eventType: 'match_approved',
      message: `Conciliación aprobada por ${session.user.id} — ${matchType}:${matchedEntityId} (${confidence}%)`,
      createdByUserId: session.user.id,
    });

    revalidatePath(RECON_PATH);
    return { success: true };
  } catch (err) {
    logRedacted('error', 'approveMatchAction', err);
    return { error: 'No se pudo aprobar la conciliación' };
  }
}

export async function rejectMatchAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requirePermission('bancos', 'write');
    const parsed = rejectMatchFromCandidateSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: 'Datos inválidos' };

    const { transactionId, matchType, matchedEntityId, confidence, matchReason } = parsed.data;

    const match = await rejectMatchFromCandidate({
      transactionId,
      matchType,
      matchedEntityId,
      confidence,
      matchReason,
      rejectedByUserId: session.user.id,
    });

    await logReconciliationEvent({
      transactionId,
      matchId: match.id,
      eventType: 'match_rejected',
      message: `Conciliación rechazada por ${session.user.id} — ${matchType}:${matchedEntityId}`,
      createdByUserId: session.user.id,
    });

    revalidatePath(RECON_PATH);
    return { success: true };
  } catch (err) {
    logRedacted('error', 'rejectMatchAction', err);
    return { error: 'No se pudo rechazar la conciliación' };
  }
}

export async function ignoreTransactionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requirePermission('bancos', 'write');
    const transactionId = Number(formData.get('transactionId'));
    if (!transactionId || transactionId < 1) return { error: 'ID inválido' };

    await updateBankTransactionStatus(transactionId, 'ignored');
    await logReconciliationEvent({
      transactionId,
      eventType: 'transaction_ignored',
      message: `Transacción marcada como ignorada por ${session.user.id}`,
      createdByUserId: session.user.id,
    });

    revalidatePath(RECON_PATH);
    return { success: true };
  } catch (err) {
    logRedacted('error', 'ignoreTransactionAction', err);
    return { error: 'No se pudo ignorar la transacción' };
  }
}
