/**
 * Scope y sensibilidad de la memoria curada.
 *
 * Una memoria mal encajada es una fuga silenciosa: un hecho de un usuario que
 * acaba en el contexto de otro, o un dato restringido inyectado en un prompt.
 * Aquí se prueban las dos direcciones del error —falta el scope y sobra el
 * scope— y qué llega realmente al modelo.
 */

jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/auth', () => ({ auth: {} }));

import {
  PROMPT_EXCLUDED_SENSITIVITY,
  isMemoryReadableInPrompt,
  validateMemoryScope,
  type AgentMemoryVisibilityRow,
} from '@/lib/agents/memory-scope';

const AHORA = new Date('2026-08-21T10:00:00.000Z');

describe('validateMemoryScope', () => {
  it('el scope user exige usuario', () => {
    expect(validateMemoryScope({ scope: 'user', scopeUserId: null, agentId: null })).toEqual({
      ok: false,
      code: 'memory_scope_user_requires_user_id',
    });
    expect(validateMemoryScope({ scope: 'user', scopeUserId: 'u1', agentId: null })).toEqual({ ok: true });
  });

  it('el scope agent exige agente', () => {
    expect(validateMemoryScope({ scope: 'agent', scopeUserId: null, agentId: null })).toEqual({
      ok: false,
      code: 'memory_scope_agent_requires_agent_id',
    });
    expect(validateMemoryScope({ scope: 'agent', scopeUserId: null, agentId: 4 })).toEqual({ ok: true });
  });

  it('rechaza un usuario colgado de un scope que no es user', () => {
    // Delata a quien creyó estar guardando algo privado en un hecho global.
    expect(validateMemoryScope({ scope: 'global', scopeUserId: 'u1', agentId: null })).toEqual({
      ok: false,
      code: 'memory_scope_unexpected_user_id',
    });
  });

  it('rechaza un agente colgado de un scope que no es agent', () => {
    expect(validateMemoryScope({ scope: 'team', scopeUserId: null, agentId: 4 })).toEqual({
      ok: false,
      code: 'memory_scope_unexpected_agent_id',
    });
  });

  it('acepta global y team sin ataduras', () => {
    expect(validateMemoryScope({ scope: 'global', scopeUserId: null, agentId: null })).toEqual({ ok: true });
    expect(validateMemoryScope({ scope: 'team', scopeUserId: null, agentId: null })).toEqual({ ok: true });
  });
});

function fila(over: Partial<AgentMemoryVisibilityRow> = {}): AgentMemoryVisibilityRow {
  return {
    scope: 'global',
    scopeUserId: null,
    agentId: null,
    sensitivity: 'internal',
    verificationStatus: 'verified',
    validUntil: null,
    ...over,
  };
}

describe('isMemoryReadableInPrompt', () => {
  const lector = { userId: 'u1', agentId: 7 };

  it('deja pasar un hecho global verificado y vigente', () => {
    expect(isMemoryReadableInPrompt(fila(), lector, AHORA)).toBe(true);
  });

  it('no deja pasar lo que nadie ha verificado', () => {
    for (const estado of ['proposed', 'rejected', 'revoked'] as const) {
      expect(isMemoryReadableInPrompt(fila({ verificationStatus: estado }), lector, AHORA)).toBe(false);
    }
  });

  it('no deja pasar lo caducado', () => {
    expect(
      isMemoryReadableInPrompt(fila({ validUntil: new Date('2026-08-21T09:00:00.000Z') }), lector, AHORA),
    ).toBe(false);
    expect(
      isMemoryReadableInPrompt(fila({ validUntil: new Date('2026-08-21T11:00:00.000Z') }), lector, AHORA),
    ).toBe(true);
  });

  it('nunca inyecta memoria restringida, aunque esté verificada', () => {
    expect(isMemoryReadableInPrompt(fila({ sensitivity: 'restricted' }), lector, AHORA)).toBe(false);
    expect(PROMPT_EXCLUDED_SENSITIVITY).toContain('restricted');
  });

  it('un hecho de otro usuario no llega a este lector', () => {
    const ajena = fila({ scope: 'user', scopeUserId: 'u2' });
    expect(isMemoryReadableInPrompt(ajena, lector, AHORA)).toBe(false);
    expect(isMemoryReadableInPrompt(fila({ scope: 'user', scopeUserId: 'u1' }), lector, AHORA)).toBe(true);
  });

  it('sin usuario identificado no se lee memoria de scope user', () => {
    const sinUsuario = { userId: null, agentId: 7 };
    expect(isMemoryReadableInPrompt(fila({ scope: 'user', scopeUserId: 'u1' }), sinUsuario, AHORA)).toBe(false);
  });

  it('un hecho de otro agente no cruza de agente', () => {
    expect(isMemoryReadableInPrompt(fila({ scope: 'agent', agentId: 9 }), lector, AHORA)).toBe(false);
    expect(isMemoryReadableInPrompt(fila({ scope: 'agent', agentId: 7 }), lector, AHORA)).toBe(true);
  });

  it('team es compartido por todo el equipo', () => {
    expect(isMemoryReadableInPrompt(fila({ scope: 'team' }), lector, AHORA)).toBe(true);
  });
});
