/**
 * Errores del runtime de agentes con código estable.
 *
 * El código viaja a logs, a la UI y a los tests; el mensaje es para humanos y
 * puede cambiar. PR 2 amplía este catálogo al ejecutar tools y turnos de
 * modelo — los códigos existentes no se renombran.
 */

export type AgentRuntimeErrorCode =
  | 'agents_disabled'
  | 'agent_not_found'
  | 'agent_disabled'
  | 'agent_invalid_input'
  | 'agent_memory_scope_invalid'
  | 'agent_approval_invalid'
  | 'agent_approval_duplicate';

export class AgentRuntimeError extends Error {
  readonly code: AgentRuntimeErrorCode;

  constructor(code: AgentRuntimeErrorCode, message: string) {
    super(message);
    this.name = 'AgentRuntimeError';
    this.code = code;
  }
}

export function isAgentRuntimeError(value: unknown): value is AgentRuntimeError {
  return value instanceof AgentRuntimeError;
}
