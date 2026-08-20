import 'server-only';

import { and, asc, eq, lte, sql } from 'drizzle-orm';

import { agentApprovals } from '@/db/schema';
import { AgentRuntimeError } from '@/lib/agents/errors';
import type { AgentApprovalErrorCode } from '@/lib/agents/approval-state';
import { db } from '@/lib/db';
import type { AgentApproval } from '@/types';

/**
 * Centro de aprobaciones.
 *
 * Cada mutación es un único `UPDATE ... WHERE <estado esperado> RETURNING`. No
 * hay lectura previa seguida de escritura, y por eso no hace falta transacción
 * interactiva: dos decisiones simultáneas sobre la misma fila las serializa
 * Postgres y solo una devuelve fila. El doble clic pierde por construcción.
 *
 * Ver docs/agent-os/data-model.md §7.
 */

export type CreateApprovalRequestInput = {
  readonly runId: number;
  readonly toolCallId: number;
  /** SHA-256 hex del JSON canónico de la acción exacta. */
  readonly actionHash: string;
  readonly actionClass: AgentApproval['actionClass'];
  readonly riskLevel?: AgentApproval['riskLevel'];
  readonly title: string;
  readonly summary?: string;
  /** Preview redactado de los argumentos, para que el humano sepa qué firma. */
  readonly parametersPreviewJson?: Record<string, unknown>;
  readonly requiredPermissionModule?: string | null;
  readonly requiredPermissionAction?: string | null;
  readonly expiresAt: Date;
};

export async function createApprovalRequest(
  input: CreateApprovalRequestInput,
): Promise<AgentApproval> {
  if (input.actionClass === 'forbidden') {
    throw new AgentRuntimeError(
      'agent_approval_invalid',
      'Una acción forbidden no es aprobable: no existe ruta que la ejecute.',
    );
  }

  const [row] = await db
    .insert(agentApprovals)
    .values({
      runId: input.runId,
      toolCallId: input.toolCallId,
      actionHash: input.actionHash,
      actionClass: input.actionClass,
      riskLevel: input.riskLevel ?? 'medium',
      title: input.title,
      summary: input.summary ?? '',
      parametersPreviewJson: input.parametersPreviewJson ?? {},
      requiredPermissionModule: input.requiredPermissionModule ?? null,
      requiredPermissionAction: input.requiredPermissionAction ?? null,
      expiresAt: input.expiresAt,
    })
    .returning();

  if (!row) throw new AgentRuntimeError('agent_approval_invalid', 'No se pudo crear la aprobación.');
  return row;
}

export type DecideApprovalInput = {
  readonly approvalId: number;
  readonly decision: 'approved' | 'rejected';
  readonly decidedByUserId: string;
  readonly note?: string | null;
};

export type DecideApprovalResult =
  | { readonly ok: true; readonly approval: AgentApproval }
  | { readonly ok: false; readonly code: AgentApprovalErrorCode };

/**
 * Decisión humana.
 *
 * El `WHERE` exige `pending` y que no haya caducado todavía. Una aprobación
 * vencida no se puede "rescatar" firmándola tarde: hay que pedirla otra vez,
 * porque el contexto que la justificaba ya no es el mismo.
 *
 * Quien llama ha comprobado antes el permiso RBAC; esta función no autoriza.
 */
export async function decideApproval(input: DecideApprovalInput): Promise<DecideApprovalResult> {
  const now = new Date();

  const [row] = await db
    .update(agentApprovals)
    .set({
      status: input.decision,
      decidedAt: now,
      decidedByUserId: input.decidedByUserId,
      decisionNote: input.note ?? null,
      updatedAt: now,
    })
    .where(
      and(
        eq(agentApprovals.id, input.approvalId),
        eq(agentApprovals.status, 'pending'),
        sql`${agentApprovals.expiresAt} > now()`,
      ),
    )
    .returning();

  if (row) return { ok: true, approval: row };

  // Sin fila: o no estaba pendiente, o ya había caducado. Distinguirlo importa
  // para el mensaje que ve el humano.
  const current = await getApproval(input.approvalId);
  if (!current) return { ok: false, code: 'approval_not_pending' };
  if (current.status !== 'pending') return { ok: false, code: 'approval_already_decided' };
  return { ok: false, code: 'approval_expired' };
}

/**
 * Gasta la aprobación. Se llama dentro del mismo camino que ejecuta la acción:
 * si este `UPDATE` no devuelve fila, la acción no se ejecuta.
 */
export async function consumeApproval(
  approvalId: number,
  expectedActionHash: string,
): Promise<DecideApprovalResult> {
  const now = new Date();

  const [row] = await db
    .update(agentApprovals)
    .set({ status: 'consumed', consumedAt: now, updatedAt: now })
    .where(
      and(
        eq(agentApprovals.id, approvalId),
        eq(agentApprovals.status, 'approved'),
        eq(agentApprovals.actionHash, expectedActionHash),
        sql`${agentApprovals.expiresAt} > now()`,
      ),
    )
    .returning();

  if (row) return { ok: true, approval: row };

  const current = await getApproval(approvalId);
  if (!current) return { ok: false, code: 'approval_not_approved' };
  if (current.actionHash !== expectedActionHash) return { ok: false, code: 'approval_hash_mismatch' };
  if (current.status === 'consumed') return { ok: false, code: 'approval_already_consumed' };
  if (current.status !== 'approved') return { ok: false, code: 'approval_not_approved' };
  return { ok: false, code: 'approval_expired' };
}

export async function getApproval(id: number): Promise<AgentApproval | null> {
  const [row] = await db.select().from(agentApprovals).where(eq(agentApprovals.id, id)).limit(1);
  return row ?? null;
}

export async function listPendingApprovals(limit = 50): Promise<readonly AgentApproval[]> {
  return db
    .select()
    .from(agentApprovals)
    .where(eq(agentApprovals.status, 'pending'))
    .orderBy(asc(agentApprovals.expiresAt))
    .limit(Math.min(limit, 200));
}

/**
 * Caduca las pendientes vencidas. Es housekeeping, no una garantía: la
 * garantía está en el `WHERE expires_at > now()` de cada mutación, que no
 * depende de que este barrido llegue a tiempo.
 */
export async function expireDueApprovals(now: Date = new Date()): Promise<number> {
  const rows = await db
    .update(agentApprovals)
    .set({ status: 'expired', updatedAt: now })
    .where(and(eq(agentApprovals.status, 'pending'), lte(agentApprovals.expiresAt, now)))
    .returning({ id: agentApprovals.id });
  return rows.length;
}
