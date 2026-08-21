import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Enums de Zack Agent OS.
 *
 * Viven todos en este fichero por una razón concreta: `pgEnum` crea un tipo
 * PostgreSQL global, así que declarar el mismo nombre en dos módulos produce
 * dos definiciones que Drizzle intenta crear por separado. Centralizarlos
 * también deja a la vista el vocabulario completo del runtime.
 *
 * Ver docs/agent-os/data-model.md §2.
 */

/** Kill switch por agente. `disabled` es el estado inicial de todos. */
export const agentStatusEnum = pgEnum('agent_status', ['active', 'paused', 'disabled']);

/**
 * Grado de autonomía. Un agente nuevo empieza siempre en `shadow`: razona y
 * deja trazas, pero no escribe ni notifica.
 */
export const agentModeEnum = pgEnum('agent_mode', ['shadow', 'recommend', 'execute']);

/** Estado canónico de una ejecución. Los terminales exigen `completed_at`. */
export const agentRunStatusEnum = pgEnum('agent_run_status', [
  'queued',
  'running',
  'waiting_approval',
  'retry_scheduled',
  'succeeded',
  'failed',
  'cancelled',
  'budget_blocked',
  'dead_letter',
]);

/** Origen de la ejecución. */
export const agentTriggerTypeEnum = pgEnum('agent_trigger_type', [
  'manual',
  'chat',
  'schedule',
  'event',
  'webhook',
  'system',
]);

/** Naturaleza de cada paso de la timeline. */
export const agentStepTypeEnum = pgEnum('agent_step_type', [
  'deterministic',
  'model',
  'tool',
  'approval',
  'handoff',
  'finalize',
]);

export const agentStepStatusEnum = pgEnum('agent_step_status', [
  'pending',
  'running',
  'waiting',
  'succeeded',
  'failed',
  'skipped',
  'cancelled',
]);

/**
 * Clasificación de riesgo de una acción. Determina la política de aprobación:
 * `read` e `internal_draft` no la necesitan; `external_side_effect` y
 * `privileged` siempre; `forbidden` no es aprobable en absoluto.
 */
export const agentActionClassEnum = pgEnum('agent_action_class', [
  'read',
  'internal_draft',
  'internal_write',
  'external_side_effect',
  'privileged',
  'forbidden',
]);

export const agentToolCallStatusEnum = pgEnum('agent_tool_call_status', [
  'proposed',
  'waiting_approval',
  'approved',
  'executing',
  'succeeded',
  'failed',
  'blocked',
  'rejected',
  'expired',
  'cancelled',
]);

/** `consumed` es terminal: una aprobación sirve para una única ejecución. */
export const agentApprovalStatusEnum = pgEnum('agent_approval_status', [
  'pending',
  'approved',
  'rejected',
  'expired',
  'cancelled',
  'consumed',
]);

export const agentEventStatusEnum = pgEnum('agent_event_status', [
  'pending',
  'claimed',
  'processed',
  'ignored',
  'dead_letter',
]);

export const agentEventSeverityEnum = pgEnum('agent_event_severity', [
  'info',
  'warning',
  'high',
  'critical',
]);

export const agentMemoryScopeEnum = pgEnum('agent_memory_scope', ['user', 'team', 'agent', 'global']);

export const agentMemorySensitivityEnum = pgEnum('agent_memory_sensitivity', [
  'public',
  'internal',
  'confidential',
  'restricted',
]);

export const agentMemoryVerificationEnum = pgEnum('agent_memory_verification', [
  'proposed',
  'verified',
  'rejected',
  'revoked',
]);

/** Qué hacer con las ventanas de schedule perdidas tras una parada. */
export const agentScheduleCatchUpEnum = pgEnum('agent_schedule_catch_up', ['skip', 'latest', 'all_limited']);

export const agentUsageKindEnum = pgEnum('agent_usage_kind', [
  'model_turn',
  'embedding',
  'external_api',
  'tool_runtime',
]);
