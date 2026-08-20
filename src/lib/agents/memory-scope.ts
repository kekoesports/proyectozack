import type {
  agentMemoryScopeEnum,
  agentMemorySensitivityEnum,
  agentMemoryVerificationEnum,
} from '@/db/schema/agentEnums';

export type AgentMemoryScope = (typeof agentMemoryScopeEnum.enumValues)[number];
export type AgentMemorySensitivity = (typeof agentMemorySensitivityEnum.enumValues)[number];
export type AgentMemoryVerification = (typeof agentMemoryVerificationEnum.enumValues)[number];

/**
 * Reglas de scope y sensibilidad de la memoria curada.
 *
 * Duplican a propósito los CHECKs de `agent_memories`: la base impide el dato
 * inválido, esto impide construirlo y da un error legible en el sitio donde se
 * puede corregir.
 *
 * Ver docs/agent-os/data-model.md §10.
 */

export type AgentMemoryScopeInput = {
  readonly scope: AgentMemoryScope;
  readonly scopeUserId: string | null;
  readonly agentId: number | null;
};

export type AgentMemoryScopeErrorCode =
  | 'memory_scope_user_requires_user_id'
  | 'memory_scope_agent_requires_agent_id'
  | 'memory_scope_unexpected_user_id'
  | 'memory_scope_unexpected_agent_id';

export type AgentMemoryScopeResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: AgentMemoryScopeErrorCode };

/**
 * Un hecho de scope `user` sin usuario acabaría siendo legible por todos, y uno
 * global con `scopeUserId` colgado sugiere una fuga al revés: alguien creyó
 * estar guardando algo privado. Ambas direcciones se rechazan.
 */
export function validateMemoryScope(input: AgentMemoryScopeInput): AgentMemoryScopeResult {
  const { scope, scopeUserId, agentId } = input;

  if (scope === 'user') {
    if (!scopeUserId) return { ok: false, code: 'memory_scope_user_requires_user_id' };
  } else if (scopeUserId) {
    return { ok: false, code: 'memory_scope_unexpected_user_id' };
  }

  if (scope === 'agent') {
    if (agentId === null) return { ok: false, code: 'memory_scope_agent_requires_agent_id' };
  } else if (agentId !== null) {
    return { ok: false, code: 'memory_scope_unexpected_agent_id' };
  }

  return { ok: true };
}

export type AgentMemoryVisibilityRow = {
  readonly scope: AgentMemoryScope;
  readonly scopeUserId: string | null;
  readonly agentId: number | null;
  readonly sensitivity: AgentMemorySensitivity;
  readonly verificationStatus: AgentMemoryVerification;
  readonly validUntil: Date | null;
};

export type AgentMemoryReader = {
  readonly userId: string | null;
  readonly agentId: number;
};

/**
 * Sensibilidad que nunca se inyecta en un prompt.
 *
 * `restricted` existe para poder registrar que algo se sabe sin exponerlo al
 * modelo. Si hiciera falta para razonar, se consulta con una tool auditada.
 */
export const PROMPT_EXCLUDED_SENSITIVITY: readonly AgentMemorySensitivity[] = ['restricted'];

/**
 * Filtro de lectura. Solo entra en el contexto del modelo la memoria
 * verificada, vigente, no restringida y del scope que le corresponde a este
 * lector: nada de otro usuario y nada de otro agente.
 */
export function isMemoryReadableInPrompt(
  row: AgentMemoryVisibilityRow,
  reader: AgentMemoryReader,
  now: Date,
): boolean {
  if (row.verificationStatus !== 'verified') return false;
  if (row.validUntil !== null && row.validUntil.getTime() <= now.getTime()) return false;
  if (PROMPT_EXCLUDED_SENSITIVITY.includes(row.sensitivity)) return false;

  switch (row.scope) {
    case 'global':
    case 'team':
      return true;
    case 'user':
      return reader.userId !== null && row.scopeUserId === reader.userId;
    case 'agent':
      return row.agentId === reader.agentId;
  }
}
