/**
 * Motor de políticas.
 *
 * Es la tabla de verdad de qué puede hacer un agente. Cada caso de aquí
 * corresponde a una fila de la matriz de docs/agent-os/agents-tools-policies.md
 * §12, y el orden de las comprobaciones importa tanto como el resultado: un
 * kill switch que se evaluara después del permiso dejaría de ser un kill switch.
 */

jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/auth', () => ({ auth: {} }));

import { canApproveActionClass, evaluatePolicy, riskLevelForActionClass } from '@/lib/agents/policy';
import type { PolicyInput } from '@/lib/agents/policy';

function entrada(over: Partial<PolicyInput> = {}): PolicyInput {
  return {
    agentsEnabled: true,
    agentStatus: 'active',
    agentMode: 'execute',
    actorRole: 'admin',
    actionClass: 'read',
    approvalPolicy: 'never',
    requiredPermission: null,
    ...over,
  };
}

describe('kill switches', () => {
  it('el switch global corta antes que nada', () => {
    // Incluso para un admin leyendo: si el sistema está apagado, la respuesta
    // no depende de quién pregunte.
    expect(evaluatePolicy(entrada({ agentsEnabled: false }))).toEqual({
      kind: 'deny',
      reason: 'agents_disabled',
    });
  });

  it('un agente pausado o desactivado no ejecuta ni lecturas', () => {
    for (const estado of ['paused', 'disabled'] as const) {
      expect(evaluatePolicy(entrada({ agentStatus: estado }))).toEqual({
        kind: 'deny',
        reason: 'agent_not_active',
      });
    }
  });

  it('el switch global gana al permiso: no se filtra si el rol tenía acceso', () => {
    const decision = evaluatePolicy(
      entrada({ agentsEnabled: false, actorRole: 'staff', requiredPermission: { module: 'facturacion', action: 'read' } }),
    );
    expect(decision).toEqual({ kind: 'deny', reason: 'agents_disabled' });
  });
});

describe('acciones prohibidas', () => {
  it('forbidden se deniega en todos los modos y para todos los roles', () => {
    for (const modo of ['shadow', 'recommend', 'execute'] as const) {
      for (const rol of ['admin', 'manager', 'staff'] as const) {
        expect(evaluatePolicy(entrada({ actionClass: 'forbidden', agentMode: modo, actorRole: rol }))).toEqual({
          kind: 'deny',
          reason: 'action_forbidden',
        });
      }
    }
  });

  it('forbidden no se salva ni declarando approvalPolicy never', () => {
    expect(
      evaluatePolicy(entrada({ actionClass: 'forbidden', approvalPolicy: 'never' })),
    ).toEqual({ kind: 'deny', reason: 'action_forbidden' });
  });
});

describe('RBAC', () => {
  it('reutiliza los permisos del CRM: un staff no lee facturación', () => {
    expect(
      evaluatePolicy(entrada({ actorRole: 'staff', requiredPermission: { module: 'facturacion', action: 'read' } })),
    ).toEqual({ kind: 'deny', reason: 'missing_permission' });
  });

  it('finance sí lee facturación', () => {
    expect(
      evaluatePolicy(entrada({ actorRole: 'finance', requiredPermission: { module: 'facturacion', action: 'read' } })),
    ).toEqual({ kind: 'allow' });
  });

  it('sin permiso declarado, basta con estar autenticado', () => {
    expect(evaluatePolicy(entrada({ actorRole: 'analyst', requiredPermission: null }))).toEqual({ kind: 'allow' });
  });

  it('el permiso se comprueba antes que el modo: shadow no oculta una falta de permiso', () => {
    expect(
      evaluatePolicy(
        entrada({
          agentMode: 'shadow',
          actorRole: 'staff',
          actionClass: 'internal_write',
          requiredPermission: { module: 'facturacion', action: 'write' },
        }),
      ),
    ).toEqual({ kind: 'deny', reason: 'missing_permission' });
  });
});

describe('modo shadow', () => {
  it('ejecuta lecturas de verdad', () => {
    expect(evaluatePolicy(entrada({ agentMode: 'shadow', actionClass: 'read' }))).toEqual({ kind: 'allow' });
  });

  it('simula todo lo demás, incluidos los borradores', () => {
    for (const clase of ['internal_draft', 'internal_write', 'external_side_effect', 'privileged'] as const) {
      expect(evaluatePolicy(entrada({ agentMode: 'shadow', actionClass: clase }))).toEqual({
        kind: 'simulate',
        reason: 'shadow_mode_no_side_effects',
      });
    }
  });
});

describe('aprobaciones', () => {
  it('los efectos externos siempre piden firma, también en execute', () => {
    expect(evaluatePolicy(entrada({ actionClass: 'external_side_effect' }))).toEqual({
      kind: 'needs_approval',
      reason: 'external_side_effect',
    });
  });

  it('las acciones privilegiadas también', () => {
    expect(evaluatePolicy(entrada({ actionClass: 'privileged' }))).toEqual({
      kind: 'needs_approval',
      reason: 'privileged_action',
    });
  });

  it('declarar approvalPolicy never NO exime a un efecto externo', () => {
    // Una tool puede endurecer su política, nunca relajarla.
    expect(
      evaluatePolicy(entrada({ actionClass: 'external_side_effect', approvalPolicy: 'never' })),
    ).toEqual({ kind: 'needs_approval', reason: 'external_side_effect' });
  });

  it('una tool puede exigir firma aunque su clase no la exigiera', () => {
    expect(evaluatePolicy(entrada({ actionClass: 'read', approvalPolicy: 'always' }))).toEqual({
      kind: 'needs_approval',
      reason: 'tool_policy_always',
    });
  });

  it('las escrituras internas piden firma hoy', () => {
    expect(
      evaluatePolicy(entrada({ actionClass: 'internal_write', approvalPolicy: 'dynamic' })),
    ).toEqual({ kind: 'needs_approval', reason: 'internal_write_needs_approval' });
  });

  it('los borradores internos no piden firma en recommend', () => {
    expect(
      evaluatePolicy(entrada({ agentMode: 'recommend', actionClass: 'internal_draft' })),
    ).toEqual({ kind: 'allow' });
  });
});

describe('riesgo y quién puede aprobar', () => {
  it('el riesgo crece con la clase de acción', () => {
    expect(riskLevelForActionClass('read')).toBe('low');
    expect(riskLevelForActionClass('internal_write')).toBe('medium');
    expect(riskLevelForActionClass('external_side_effect')).toBe('high');
    expect(riskLevelForActionClass('privileged')).toBe('critical');
  });

  it('solo admin aprueba acciones privilegiadas', () => {
    expect(canApproveActionClass('admin', 'privileged')).toBe(true);
    expect(canApproveActionClass('manager', 'privileged')).toBe(false);
    // admin_limited_tasks es un rol de operación acotada: reiniciar un servicio
    // o restaurar un backup queda fuera.
    expect(canApproveActionClass('admin_limited_tasks', 'privileged')).toBe(false);
  });

  it('nadie aprueba lo prohibido', () => {
    for (const rol of ['admin', 'manager', 'admin_limited_tasks'] as const) {
      expect(canApproveActionClass(rol, 'forbidden')).toBe(false);
    }
  });

  it('un staff no aprueba efectos externos', () => {
    expect(canApproveActionClass('staff', 'external_side_effect')).toBe(false);
    expect(canApproveActionClass('manager', 'external_side_effect')).toBe(true);
  });
});
