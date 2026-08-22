import { hasPermission } from '@/lib/permissions';
import type { Role } from '@/lib/auth-guard';

import type {
  AgentActionClass,
  AgentApprovalPolicy,
  AgentMode,
  AgentStatus,
  AgentToolPermission,
} from './types';

/**
 * Motor de políticas: decide qué puede hacer una tool, aquí y ahora.
 *
 * Implementa la matriz de docs/agent-os/agents-tools-policies.md §12. Es puro
 * —entra estado, sale una decisión— para que la regla se pueda leer y probar
 * entera sin levantar nada.
 *
 * Lo que este módulo **no** hace: mirar el prompt, el nombre de la tool o su
 * descripción. La autoridad viene del agente configurado, del rol real del
 * actor y de la clase de acción; nunca del texto que produce el modelo.
 */

export type PolicyDecision =
  /** Ejecuta ya. */
  | { readonly kind: 'allow' }
  /** Registra qué haría, sin hacerlo. Es la salida normal en `shadow`. */
  | { readonly kind: 'simulate'; readonly reason: PolicyReason }
  /** Congela la acción y pide firma humana. */
  | { readonly kind: 'needs_approval'; readonly reason: PolicyReason }
  /** No se ejecuta ni se puede aprobar. */
  | { readonly kind: 'deny'; readonly reason: PolicyReason };

export type PolicyReason =
  | 'agents_disabled'
  | 'agent_not_active'
  | 'action_forbidden'
  | 'missing_permission'
  | 'shadow_mode_no_side_effects'
  | 'external_side_effect'
  | 'privileged_action'
  | 'internal_write_needs_approval'
  | 'tool_policy_always';

export type PolicyInput = {
  readonly agentStatus: AgentStatus;
  readonly agentMode: AgentMode;
  readonly actorRole: Role;
  readonly actionClass: AgentActionClass;
  readonly approvalPolicy: AgentApprovalPolicy;
  readonly requiredPermission: AgentToolPermission | null;
  /** Kill switch global. Se pasa como dato para que la política siga siendo pura. */
  readonly agentsEnabled: boolean;
};

/** Clases que no producen ningún efecto observable fuera de la ejecución. */
const CLASES_SIN_EFECTO: readonly AgentActionClass[] = ['read'];

export function evaluatePolicy(input: PolicyInput): PolicyDecision {
  // 1. Kill switch global. Antes que nada, incluso antes del permiso: si el
  //    sistema está apagado, la respuesta no depende de quién pregunte.
  if (!input.agentsEnabled) {
    return { kind: 'deny', reason: 'agents_disabled' };
  }

  // 2. Kill switch por agente.
  if (input.agentStatus !== 'active') {
    return { kind: 'deny', reason: 'agent_not_active' };
  }

  // 3. `forbidden` no tiene ruta de ejecución ni de aprobación. No es "muy
  //    restringido": es que no existe forma de llegar a ejecutarlo.
  if (input.actionClass === 'forbidden') {
    return { kind: 'deny', reason: 'action_forbidden' };
  }

  // 4. Permiso del CRM, con la matriz que ya existe. Sin duplicarla.
  if (input.requiredPermission && !hasPermission(input.actorRole, input.requiredPermission.module, input.requiredPermission.action)) {
    return { kind: 'deny', reason: 'missing_permission' };
  }

  // 5. Shadow: solo lecturas se ejecutan de verdad. Todo lo demás se simula,
  //    que es exactamente para lo que existe el modo — comparar lo que el
  //    agente habría hecho con lo que hizo un humano, sin consecuencias.
  if (input.agentMode === 'shadow' && !CLASES_SIN_EFECTO.includes(input.actionClass)) {
    return { kind: 'simulate', reason: 'shadow_mode_no_side_effects' };
  }

  // 6. Efectos externos y privilegios: firma humana, siempre, en cualquier modo.
  if (input.actionClass === 'external_side_effect') {
    return { kind: 'needs_approval', reason: 'external_side_effect' };
  }
  if (input.actionClass === 'privileged') {
    return { kind: 'needs_approval', reason: 'privileged_action' };
  }

  // 7. La tool puede endurecer su propia política, nunca relajarla: este check
  //    va DESPUÉS de los anteriores, así que un `never` no salta nada.
  if (input.approvalPolicy === 'always') {
    return { kind: 'needs_approval', reason: 'tool_policy_always' };
  }

  // 8. Escrituras internas: hoy piden aprobación siempre. Cuando se midan y se
  //    decida abrir la mano en `execute`, se cambia aquí y no en cada tool.
  if (input.actionClass === 'internal_write' && input.approvalPolicy === 'dynamic') {
    return { kind: 'needs_approval', reason: 'internal_write_needs_approval' };
  }

  // 9. Lecturas y borradores internos en recommend/execute.
  return { kind: 'allow' };
}

/**
 * Riesgo que se muestra al humano en el centro de aprobaciones.
 *
 * No cambia lo que se permite: solo ordena la cola y decide qué acciones piden
 * confirmación reforzada en la UI (PR 4).
 */
export function riskLevelForActionClass(actionClass: AgentActionClass): 'low' | 'medium' | 'high' | 'critical' {
  switch (actionClass) {
    case 'read':
    case 'internal_draft':
      return 'low';
    case 'internal_write':
      return 'medium';
    case 'external_side_effect':
      return 'high';
    case 'privileged':
    case 'forbidden':
      return 'critical';
  }
}

/**
 * Aprobar acciones privilegiadas es cosa de `admin`.
 *
 * `admin_limited_tasks` queda fuera a propósito: es un rol de operación
 * acotada, y reiniciar un servicio o restaurar un backup no entra ahí.
 */
export function canApproveActionClass(role: Role, actionClass: AgentActionClass): boolean {
  if (actionClass === 'forbidden') return false;
  if (actionClass === 'privileged') return role === 'admin';
  return role === 'admin' || role === 'admin_limited_tasks' || role === 'manager';
}
