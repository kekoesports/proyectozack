/**
 * Formato del panel.
 *
 * Dos decisiones que no son cosméticas: cómo se enseña un coste que no se
 * conoce del todo, y qué estados se pintan como algo que pide intervención.
 */

jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({ db: {}, getTransactionalDb: () => ({}) }));
jest.mock('@/lib/auth', () => ({ auth: {} }));

import {
  SEGUNDOS_WORKER_VIVO,
  errorCodeLabel,
  formatCost,
  formatMicros,
  formatRelative,
  isUnknownOutcome,
  isWorkerAlive,
  runStatusTone,
} from '@/features/admin/agents/format';

const AHORA = new Date('2026-08-21T10:00:00.000Z');

describe('coste', () => {
  it('convierte micros a dólares', () => {
    expect(formatMicros(1_000_000)).toContain('1,00');
    expect(formatMicros(2_500_000)).toContain('2,50');
  });

  it('con tarifa desconocida enseña un mínimo, no una cifra', () => {
    // Un total que incluye consumos sin precio conocido NO es el coste: es una
    // cota inferior. Enseñarlo como cifra exacta sería el problema que
    // `pricingUnknown` existe para evitar.
    expect(formatCost(1_000_000, true)).toMatch(/^≥/);
    expect(formatCost(1_000_000, false)).not.toMatch(/^≥/);
  });
});

describe('tonos de estado', () => {
  it('lo terminado bien es ok y lo roto es alarma', () => {
    expect(runStatusTone('succeeded')).toBe('ok');
    expect(runStatusTone('failed')).toBe('alarma');
    expect(runStatusTone('dead_letter')).toBe('alarma');
  });

  it('esperar una firma no es un error', () => {
    // Pintarlo en rojo llevaría a tratar como incidencia algo que solo espera a
    // una persona.
    expect(runStatusTone('waiting_approval')).toBe('espera');
  });

  it('quedarse sin presupuesto es un aviso, no un fallo', () => {
    // El sistema hizo justo lo que debía.
    expect(runStatusTone('budget_blocked')).toBe('aviso');
  });
});

describe('desenlace desconocido', () => {
  it('reconoce los tres códigos', () => {
    expect(isUnknownOutcome('tool_timeout_indeterminate')).toBe(true);
    expect(isUnknownOutcome('tool_call_in_flight')).toBe(true);
    expect(isUnknownOutcome('tool_outcome_unknown')).toBe(true);
  });

  it('un fallo corriente no lo es', () => {
    expect(isUnknownOutcome('provider_quota')).toBe(false);
    expect(isUnknownOutcome('invalid_tool_input')).toBe(false);
    expect(isUnknownOutcome(null)).toBe(false);
  });

  it('los explica en castellano llano', () => {
    expect(errorCodeLabel('tool_timeout_indeterminate')).toContain('no se sabe');
    expect(errorCodeLabel('approval_rejected')).toContain('rechazó');
  });

  it('un código sin traducir se enseña tal cual, no vacío', () => {
    expect(errorCodeLabel('codigo_futuro')).toBe('codigo_futuro');
  });
});

describe('salud del worker', () => {
  it('un latido reciente es señal de vida', () => {
    expect(isWorkerAlive(new Date(AHORA.getTime() - 30_000), AHORA)).toBe(true);
  });

  it('un latido viejo no, diga lo que diga su estado', () => {
    // Un worker que murió sin apagarse ordenadamente deja su fila en 'healthy'.
    expect(isWorkerAlive(new Date(AHORA.getTime() - (SEGUNDOS_WORKER_VIVO + 10) * 1_000), AHORA)).toBe(
      false,
    );
  });
});

describe('fechas relativas', () => {
  it('escala de segundos a días', () => {
    expect(formatRelative(new Date(AHORA.getTime() - 30_000), AHORA)).toContain('momento');
    expect(formatRelative(new Date(AHORA.getTime() - 600_000), AHORA)).toContain('min');
    expect(formatRelative(new Date(AHORA.getTime() - 7_200_000), AHORA)).toContain('h');
    expect(formatRelative(new Date(AHORA.getTime() - 172_800_000), AHORA)).toContain('d');
  });

  it('sin fecha no inventa una', () => {
    expect(formatRelative(null, AHORA)).toBe('—');
  });
});
