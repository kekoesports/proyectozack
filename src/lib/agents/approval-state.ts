import type {
  agentApprovalStatusEnum,
  agentActionClassEnum,
} from '@/db/schema/agentEnums';

export type AgentApprovalStatus = (typeof agentApprovalStatusEnum.enumValues)[number];
export type AgentActionClass = (typeof agentActionClassEnum.enumValues)[number];

/**
 * Máquina de estados de una aprobación.
 *
 * Vive separada de la capa de datos para poder probar cada transición sin
 * Postgres, pero no la sustituye: la DB impone en paralelo los mismos límites
 * (`agent_approvals_pending_hash_uq`, `agent_approvals_decided_ck`,
 * `agent_approvals_consumed_ck`). Dos capas porque una sola invita a que un
 * `UPDATE` puntual se salte la otra.
 *
 * Ver docs/agent-os/data-model.md §7.
 */

export type AgentApprovalTransition = 'approve' | 'reject' | 'cancel' | 'expire' | 'consume';

/** Códigos estables: viajan a logs y a la UI sin traducirse. */
export type AgentApprovalErrorCode =
  | 'approval_not_pending'
  | 'approval_not_approved'
  | 'approval_already_decided'
  | 'approval_expired'
  | 'approval_already_consumed'
  | 'approval_hash_mismatch'
  | 'approval_action_forbidden';

export type AgentApprovalTransitionResult =
  | { readonly ok: true; readonly next: AgentApprovalStatus }
  | { readonly ok: false; readonly code: AgentApprovalErrorCode };

const TERMINAL: readonly AgentApprovalStatus[] = ['rejected', 'expired', 'cancelled', 'consumed'];

export function isTerminalApprovalStatus(status: AgentApprovalStatus): boolean {
  return TERMINAL.includes(status);
}

/**
 * Qué transición admite una aprobación en su estado actual.
 *
 * `consume` solo parte de `approved`: es lo que convierte una autorización en
 * un único disparo. Una aprobación ya consumida no vuelve a servir aunque el
 * worker reintente el paso.
 */
export function nextApprovalStatus(
  current: AgentApprovalStatus,
  transition: AgentApprovalTransition,
): AgentApprovalTransitionResult {
  switch (transition) {
    case 'approve':
    case 'reject':
      if (current !== 'pending') {
        return { ok: false, code: isTerminalApprovalStatus(current) ? 'approval_already_decided' : 'approval_not_pending' };
      }
      return { ok: true, next: transition === 'approve' ? 'approved' : 'rejected' };
    case 'cancel':
      if (current !== 'pending' && current !== 'approved') {
        return { ok: false, code: 'approval_already_decided' };
      }
      return { ok: true, next: 'cancelled' };
    case 'expire':
      if (current !== 'pending' && current !== 'approved') {
        return { ok: false, code: 'approval_already_decided' };
      }
      return { ok: true, next: 'expired' };
    case 'consume':
      if (current === 'consumed') return { ok: false, code: 'approval_already_consumed' };
      if (current !== 'approved') return { ok: false, code: 'approval_not_approved' };
      return { ok: true, next: 'consumed' };
  }
}

export type AgentApprovalSnapshot = {
  readonly status: AgentApprovalStatus;
  readonly actionHash: string;
  readonly actionClass: AgentActionClass;
  readonly expiresAt: Date;
  readonly consumedAt: Date | null;
};

/**
 * Última comprobación antes de ejecutar una acción aprobada.
 *
 * El orden importa: primero se contrasta el hash. Una aprobación válida para
 * OTRA acción no debe llegar nunca a evaluarse por su fecha, porque el fallo
 * que interesa reportar es "esto no es lo que se aprobó", no "ha caducado".
 */
export function checkApprovalUsable(
  approval: AgentApprovalSnapshot,
  expectedActionHash: string,
  now: Date,
): { readonly ok: true } | { readonly ok: false; readonly code: AgentApprovalErrorCode } {
  if (approval.actionHash !== expectedActionHash) return { ok: false, code: 'approval_hash_mismatch' };
  if (approval.actionClass === 'forbidden') return { ok: false, code: 'approval_action_forbidden' };
  if (approval.consumedAt !== null || approval.status === 'consumed') {
    return { ok: false, code: 'approval_already_consumed' };
  }
  if (approval.status !== 'approved') return { ok: false, code: 'approval_not_approved' };
  if (approval.expiresAt.getTime() <= now.getTime()) return { ok: false, code: 'approval_expired' };
  return { ok: true };
}

/** Clases de acción que exigen aprobación humana sí o sí. */
export const ALWAYS_APPROVED_ACTION_CLASSES: readonly AgentActionClass[] = [
  'external_side_effect',
  'privileged',
];

/** `forbidden` no es aprobable: no hay ruta que la ejecute. */
export function requiresApproval(actionClass: AgentActionClass): boolean {
  return ALWAYS_APPROVED_ACTION_CLASSES.includes(actionClass);
}
