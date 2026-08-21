/**
 * Transiciones de estado y política de reintentos.
 *
 * Los CHECK de `agent_runs` ya impiden el estado imposible; esto impide
 * construirlo y le pone nombre. Cuando divergen, manda la base.
 */

jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/auth', () => ({ auth: {} }));

import {
  CODIGOS_INDETERMINADOS,
  ESTADOS_TERMINALES,
  canTransitionRun,
  computeRetryDelayMs,
  isIndeterminateErrorCode,
  isRetryableErrorCode,
  isTerminalRunStatus,
  validateRunState,
} from '@/lib/agents/run-state';

const AHORA = new Date('2026-08-21T10:00:00.000Z');

describe('transiciones', () => {
  it('el camino feliz es válido', () => {
    expect(canTransitionRun('queued', 'running')).toEqual({ ok: true });
    expect(canTransitionRun('running', 'succeeded')).toEqual({ ok: true });
  });

  it('un estado terminal no se reabre', () => {
    for (const estado of ESTADOS_TERMINALES) {
      expect(canTransitionRun(estado, 'running')).toEqual({ ok: false, code: 'run_terminal' });
    }
  });

  it('una ejecución en cola no salta directamente a completada', () => {
    expect(canTransitionRun('queued', 'succeeded')).toEqual({
      ok: false,
      code: 'run_invalid_transition',
    });
  });

  it('un lease perdido devuelve la ejecución a la cola', () => {
    expect(canTransitionRun('running', 'queued')).toEqual({ ok: true });
  });

  it('esperar aprobación se reanuda por la cola', () => {
    expect(canTransitionRun('waiting_approval', 'queued')).toEqual({ ok: true });
    expect(canTransitionRun('waiting_approval', 'succeeded')).toEqual({
      ok: false,
      code: 'run_invalid_transition',
    });
  });

  it('reconoce los estados terminales', () => {
    expect(isTerminalRunStatus('dead_letter')).toBe(true);
    expect(isTerminalRunStatus('budget_blocked')).toBe(true);
    expect(isTerminalRunStatus('running')).toBe(false);
  });
});

describe('validateRunState', () => {
  const base = { leaseOwner: null, leaseExpiresAt: null, completedAt: null };

  it('acepta un estado coherente', () => {
    expect(
      validateRunState({ ...base, status: 'running', leaseOwner: 'w1', leaseExpiresAt: AHORA }),
    ).toEqual([]);
  });

  it('running sin lease es una ejecución que nadie puede recuperar', () => {
    expect(validateRunState({ ...base, status: 'running' })).toEqual(['running_requires_lease']);
  });

  it('esperar aprobación con lease retenido es un lease que nadie libera', () => {
    expect(
      validateRunState({ ...base, status: 'waiting_approval', leaseOwner: 'w1' }),
    ).toEqual(['waiting_approval_holds_lease']);
  });

  it('un estado terminal exige completed_at', () => {
    expect(validateRunState({ ...base, status: 'succeeded' })).toEqual([
      'terminal_requires_completed_at',
    ]);
    expect(validateRunState({ ...base, status: 'succeeded', completedAt: AHORA })).toEqual([]);
  });

  it('acumula varias violaciones a la vez', () => {
    expect(validateRunState({ ...base, status: 'running', completedAt: null })).toContain(
      'running_requires_lease',
    );
  });
});

describe('reintentos', () => {
  it('solo reintenta lo transitorio', () => {
    expect(isRetryableErrorCode('provider_quota')).toBe(true);
    expect(isRetryableErrorCode('tool_timeout')).toBe(true);
    expect(isRetryableErrorCode('lease_lost')).toBe(true);
  });

  it('NO reintenta el timeout de una tool que escribe', () => {
    // Ahí no se sabe si la acción ocurrió, y reintentar lo que quizá ya pasó
    // es justo el fallo que la idempotencia existe para evitar.
    expect(isRetryableErrorCode('tool_timeout_indeterminate')).toBe(false);
    expect(isIndeterminateErrorCode('tool_timeout_indeterminate')).toBe(true);
    expect(isIndeterminateErrorCode('tool_call_in_flight')).toBe(true);
  });

  it('un código indeterminado no es a la vez reintentable', () => {
    for (const code of CODIGOS_INDETERMINADOS) {
      expect(isRetryableErrorCode(code)).toBe(false);
    }
  });

  it('no reintenta fallos deterministas', () => {
    // Reintentar un input inválido o un permiso que falta gasta presupuesto y
    // llega al mismo sitio; lo único que cambia es que tarda más en verse.
    expect(isRetryableErrorCode('invalid_tool_input')).toBe(false);
    expect(isRetryableErrorCode('unknown_tool')).toBe(false);
    expect(isRetryableErrorCode('policy_denied')).toBe(false);
    expect(isRetryableErrorCode(null)).toBe(false);
    expect(isRetryableErrorCode(undefined)).toBe(false);
  });

  it('el backoff crece exponencialmente y tiene techo', () => {
    expect(computeRetryDelayMs(0, 0)).toBe(1_000);
    expect(computeRetryDelayMs(1, 0)).toBe(2_000);
    expect(computeRetryDelayMs(3, 0)).toBe(8_000);
    expect(computeRetryDelayMs(20, 0)).toBe(60_000);
  });

  it('el jitter separa a los que fallaron a la vez', () => {
    // Sin jitter, N ejecuciones caídas por la misma causa reintentan a la vez y
    // vuelven a tumbar lo que acaba de recuperarse.
    const sinJitter = computeRetryDelayMs(3, 0);
    const conJitter = computeRetryDelayMs(3, 1);
    expect(conJitter).toBeGreaterThan(sinJitter);
    expect(conJitter).toBeLessThanOrEqual(sinJitter * 1.25);
  });

  it('un intento negativo no produce una espera absurda', () => {
    expect(computeRetryDelayMs(-5, 0)).toBe(1_000);
  });
});
