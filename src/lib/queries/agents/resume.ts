import 'server-only';

import { and, eq, sql } from 'drizzle-orm';

import { agentApprovals, agentRuns } from '@/db/schema';
import type { AgentApprovalErrorCode } from '@/lib/agents/approval-state';
import { getTransactionalDb } from '@/lib/db';
import type { AgentApproval, AgentRun } from '@/types';

/**
 * Decidir una aprobación y mover la ejecución, en la misma transacción.
 *
 * Antes de esto, `decideApproval` solo tocaba `agent_approvals`. La ejecución
 * seguía en `waiting_approval` y el claim del worker solo mira
 * `queued`/`retry_scheduled`: aprobar una acción **no hacía nada**. El humano
 * firmaba y la ejecución se quedaba parada para siempre.
 *
 * Las dos escrituras van juntas porque separarlas deja dos estados imposibles
 * de arreglar solos: una aprobación concedida con la ejecución parada, o una
 * ejecución reencolada sin permiso para actuar.
 */

export type DecideAndResumeInput = {
  readonly approvalId: number;
  readonly decision: 'approved' | 'rejected';
  readonly decidedByUserId: string;
  readonly note?: string | null;
};

export type DecideAndResumeResult =
  | { readonly ok: true; readonly approval: AgentApproval; readonly runStatus: AgentRun['status'] }
  | { readonly ok: false; readonly code: AgentApprovalErrorCode };

/**
 * Aprobar reencola; rechazar termina.
 *
 * **Aprobar no consume un reintento.** El claim hace `attempt = attempt + 1`
 * siempre, así que al reencolar se compensa restando uno. Sin eso, una
 * ejecución que pasa tres veces por aprobación agota sus tres intentos sin que
 * haya fallado nada, y acaba en `queued` con `attempt >= max_attempts`: una
 * fila que el claim ya no coge y que `recoverExpiredLeases` no ve, porque solo
 * mira las `running`. Un huérfano invisible.
 *
 * Esperar una firma humana no es un fallo, y no debe gastar el presupuesto de
 * reintentos que existe para los fallos de verdad.
 */
export async function decideApprovalAndResumeRun(
  input: DecideAndResumeInput,
): Promise<DecideAndResumeResult> {
  const db = getTransactionalDb();
  const ahora = new Date();

  return db.transaction(async (tx) => {
    const [aprobacion] = await tx
      .update(agentApprovals)
      .set({
        status: input.decision,
        decidedAt: ahora,
        decidedByUserId: input.decidedByUserId,
        decisionNote: input.note ?? null,
        updatedAt: ahora,
      })
      .where(
        and(
          eq(agentApprovals.id, input.approvalId),
          eq(agentApprovals.status, 'pending'),
          sql`${agentApprovals.expiresAt} > now()`,
        ),
      )
      .returning();

    if (!aprobacion) {
      // Sin fila: o no estaba pendiente, o caducó. Distinguirlo importa para el
      // mensaje que ve quien pulsó.
      const [actual] = await tx
        .select({ status: agentApprovals.status })
        .from(agentApprovals)
        .where(eq(agentApprovals.id, input.approvalId))
        .limit(1);

      if (!actual) return { ok: false, code: 'approval_not_pending' };
      if (actual.status !== 'pending') return { ok: false, code: 'approval_already_decided' };
      return { ok: false, code: 'approval_expired' };
    }

    if (input.decision === 'approved') {
      await tx
        .update(agentRuns)
        .set({
          status: 'queued',
          availableAt: ahora,
          // Compensa el `attempt + 1` que hará el claim: reanudar tras una
          // firma no gasta un intento.
          attempt: sql`greatest(${agentRuns.attempt} - 1, 0)`,
          leaseOwner: null,
          leaseExpiresAt: null,
          updatedAt: ahora,
        })
        .where(and(eq(agentRuns.id, aprobacion.runId), eq(agentRuns.status, 'waiting_approval')));

      return { ok: true, approval: aprobacion, runStatus: 'queued' };
    }

    // Rechazar termina la ejecución. `completed_at` va en el MISMO `UPDATE`
    // porque `agent_runs_terminal_completed_ck` no admite un estado terminal
    // sin fecha ni por un instante.
    await tx
      .update(agentRuns)
      .set({
        status: 'cancelled',
        completedAt: ahora,
        leaseOwner: null,
        leaseExpiresAt: null,
        lastErrorCode: 'approval_rejected',
        lastErrorMessage: 'Una persona rechazó la acción propuesta.',
        outputSummary: 'Rechazada en el centro de aprobaciones.',
        updatedAt: ahora,
      })
      .where(and(eq(agentRuns.id, aprobacion.runId), eq(agentRuns.status, 'waiting_approval')));

    return { ok: true, approval: aprobacion, runStatus: 'cancelled' };
  });
}

/**
 * Ejecuciones atascadas: en cola pero que el claim ya no puede coger.
 *
 * Es la categoría de huérfano que nadie ve. `recoverExpiredLeases` solo mira
 * las `running`, así que una fila en `queued` con los intentos agotados no la
 * recoge nadie y tampoco aparece como fallida. Sin esta consulta, la única
 * forma de encontrarla sería que alguien preguntara por qué una rutina dejó de
 * producir informes.
 */
export async function listStuckRuns(limite = 50): Promise<readonly AgentRun[]> {
  const db = getTransactionalDb();
  return db
    .select()
    .from(agentRuns)
    .where(
      and(
        sql`${agentRuns.status} IN ('queued', 'retry_scheduled')`,
        sql`${agentRuns.attempt} >= ${agentRuns.maxAttempts}`,
      ),
    )
    .limit(limite);
}

/**
 * Devuelve a la cola una ejecución atascada, con un intento más de margen.
 *
 * Acción manual y explícita: subir `max_attempts` automáticamente convertiría
 * el límite de reintentos en una sugerencia.
 *
 * El nuevo tope es `attempt + 1`, **no** `max_attempts + 1`. La diferencia
 * importa: una fila atascada cumple `attempt >= max_attempts`, así que sumarle
 * uno al tope puede dejarlos iguales, y entonces el `WHERE attempt < max_attempts`
 * del claim sigue excluyéndola — quedaría en `queued`, sin coger nunca y sin
 * error que lo delate. Con `attempt + 1` el claim la coge y su `attempt + 1`
 * aterriza justo en el tope, dentro de `agent_runs_attempt_ck`.
 */
export async function unstickRun(runId: number): Promise<boolean> {
  const db = getTransactionalDb();
  const filas = await db
    .update(agentRuns)
    .set({
      status: 'queued',
      availableAt: new Date(),
      maxAttempts: sql`${agentRuns.attempt} + 1`,
      leaseOwner: null,
      leaseExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(agentRuns.id, runId),
        sql`${agentRuns.status} IN ('queued', 'retry_scheduled')`,
        sql`${agentRuns.attempt} >= ${agentRuns.maxAttempts}`,
      ),
    )
    .returning({ id: agentRuns.id });

  return filas.length > 0;
}
