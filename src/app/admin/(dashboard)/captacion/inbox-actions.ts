'use server';
import { revalidatePath } from 'next/cache';
import { and, eq, gt } from 'drizzle-orm';
import { requireAnyRole } from '@/lib/auth-guard';
import { db } from '@/lib/db';
import { intakeInbox } from '@/db/schema/intakeReliability';
import { IntakeInboxControl } from '@/lib/schemas/intakeReconciliation';
import { IntakeWahaMessage } from '@/lib/schemas/intakeWaha';

export async function controlIntakeInboxAction(_previous: { ok: boolean; error?: string }, formData: FormData) {
  const session = await requireAnyRole(['admin', 'manager'], '/admin/login');
  const parsed = IntakeInboxControl.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: 'Entrada no válida.' };
  const retry = parsed.data.action === 'retry';
  try {
    if (retry) {
      const [entry] = await db.select({ payload: intakeInbox.payload }).from(intakeInbox).where(eq(intakeInbox.id, parsed.data.id));
      const message = IntakeWahaMessage.safeParse(entry?.payload.payload);
      if (!message.success || message.data.timestamp * 1000 < Date.now() - 180_000) {
        return { ok: false, error: 'El mensaje ya es antiguo. Continúa desde el chat original; no se ha reenviado nada.' };
      }
    }
    const rows = await db.update(intakeInbox).set({ status: retry ? 'pending' : 'reviewed',
      nextAttemptAt: new Date(), leaseUntil: null,
      ...(retry ? { attempts: 0, reason: 'manual-retry', finishedAt: null }
        : { reason: 'reviewed-by-team', result: JSON.stringify({ reviewedBy: session.user.id }), finishedAt: new Date() }),
    }).where(and(eq(intakeInbox.id, parsed.data.id), eq(intakeInbox.status, 'failed'),
      ...(retry ? [gt(intakeInbox.receivedAt, new Date(Date.now() - 180_000))] : []))).returning({ id: intakeInbox.id });
    if (!rows.length) return { ok: false, error: 'La entrada ha cambiado o ya es antigua. Revisa el chat original; no se ha reenviado nada.' };
    revalidatePath('/admin/captacion');
    return { ok: true };
  } catch { return { ok: false, error: 'No se ha podido actualizar la entrada.' }; }
}
