/**
 * Reglas deterministas de Guardian.
 *
 * Aquí se prueba lo que hace fiable a un vigilante: que detecte lo que tiene
 * que detectar, con el umbral exacto, y que **no** invente lo que no.
 *
 * Todos los fixtures son sintéticos. Ni un nombre real, ni un importe, ni un
 * email: un test de infraestructura no necesita datos de nadie.
 */

jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({ db: {}, getTransactionalDb: () => ({}) }));
jest.mock('@/lib/auth', () => ({ auth: {} }));

import {
  DEFAULT_THRESHOLDS,
  evaluateGuardianRules,
  overallSeverity,
} from '@/lib/agents/guardian/rules';
import type { AgentEvent } from '@/types';

const AHORA = new Date('2026-08-21T10:00:00.000Z');
let siguienteId = 1;

function evento(
  eventType: string,
  payload: Record<string, unknown>,
  severity: AgentEvent['severity'] = 'warning',
): AgentEvent {
  return {
    id: siguienteId++,
    source: 'collector',
    eventType,
    externalId: null,
    eventKey: `k-${siguienteId}`,
    severity,
    status: 'pending',
    payloadJson: payload,
    fingerprint: null,
    occurredAt: AHORA,
    availableAt: AHORA,
    claimedBy: null,
    claimExpiresAt: null,
    processedAt: null,
    attempt: 0,
    lastError: null,
    createdAt: AHORA,
  };
}

beforeEach(() => {
  siguienteId = 1;
});

describe('disco', () => {
  it('al 91 % es crítico', () => {
    const h = evaluateGuardianRules([evento('system.disk', { usedPct: 91 })]);
    expect(h).toHaveLength(1);
    expect(h[0]?.code).toBe('disk_critical');
    expect(h[0]?.severity).toBe('critical');
  });

  it('al 85 % es aviso', () => {
    const h = evaluateGuardianRules([evento('system.disk', { usedPct: 85 })]);
    expect(h[0]?.code).toBe('disk_warning');
  });

  it('al 79 % no es nada', () => {
    // Un vigilante que avisa siempre enseña a ignorarlo.
    expect(evaluateGuardianRules([evento('system.disk', { usedPct: 79 })])).toHaveLength(0);
  });

  it('el umbral es inclusivo: exactamente 90 ya es crítico', () => {
    const h = evaluateGuardianRules([evento('system.disk', { usedPct: DEFAULT_THRESHOLDS.diskCriticalPct })]);
    expect(h[0]?.severity).toBe('critical');
  });

  it('un payload sin el dato no produce hallazgo inventado', () => {
    expect(evaluateGuardianRules([evento('system.disk', { otraCosa: 1 })])).toHaveLength(0);
  });
});

describe('inodos', () => {
  it('al 92 % es crítico y lo explica', () => {
    const h = evaluateGuardianRules([evento('system.inodes', { usedPct: 92 })]);
    expect(h[0]?.code).toBe('inodes_critical');
    // El síntoma engaña: hay espacio y aun así no se puede escribir.
    expect(h[0]?.summary).toMatch(/espacio/i);
  });
});

describe('memoria y swap', () => {
  it('RAM al 95 % con swap al 60 % es crítico', () => {
    const h = evaluateGuardianRules([evento('system.memory', { usedPct: 95, swapPct: 60 })]);
    expect(h[0]?.code).toBe('memory_critical');
  });

  it('RAM al 95 % con swap bajo es solo aviso', () => {
    // Una máquina con swap usado y RAM libre lleva así desde el último pico.
    const h = evaluateGuardianRules([evento('system.memory', { usedPct: 95, swapPct: 5 })]);
    expect(h[0]?.code).toBe('memory_warning');
  });

  it('RAM al 70 % no es nada, tenga el swap que tenga', () => {
    expect(evaluateGuardianRules([evento('system.memory', { usedPct: 70, swapPct: 90 })])).toHaveLength(0);
  });
});

describe('servicios', () => {
  it('un servicio inactivo es crítico', () => {
    const h = evaluateGuardianRules([evento('system.service', { unit: 'servicio-x', state: 'inactive' })]);
    expect(h[0]?.code).toBe('service_down');
    expect(h[0]?.title).toContain('servicio-x');
  });

  it('uno activo no produce nada', () => {
    expect(
      evaluateGuardianRules([evento('system.service', { unit: 'servicio-x', state: 'active' })]),
    ).toHaveLength(0);
  });
});

describe('backups', () => {
  it('uno de hace 30 h supera el objetivo', () => {
    const h = evaluateGuardianRules([evento('backup.heartbeat', { ageHours: 30 })]);
    expect(h[0]?.code).toBe('backup_stale');
    expect(h[0]?.severity).toBe('high');
  });

  it('uno de hace 12 h está bien', () => {
    expect(evaluateGuardianRules([evento('backup.heartbeat', { ageHours: 12 })])).toHaveLength(0);
  });

  it('un fallo explícito se reporta aunque no haya edad', () => {
    const h = evaluateGuardianRules([evento('backup.failed', { reason: 'sin-ficheros' })]);
    expect(h[0]?.code).toBe('backup_failed');
  });
});

describe('aplicación y base', () => {
  it('tres fallos seguidos son una caída', () => {
    const h = evaluateGuardianRules([evento('app.health', { consecutiveFailures: 3 })]);
    expect(h[0]?.code).toBe('app_down');
  });

  it('un fallo aislado no lo es', () => {
    // Un 500 suelto no es una caída, y tratarlo como tal produce ruido.
    expect(evaluateGuardianRules([evento('app.health', { consecutiveFailures: 1 })])).toHaveLength(0);
  });

  it('la base caída es crítica', () => {
    const h = evaluateGuardianRules([evento('db.health', { status: 'down' })]);
    expect(h[0]?.code).toBe('database_down');
  });
});

describe('TLS', () => {
  it('a 5 días es high; a 15, aviso', () => {
    expect(evaluateGuardianRules([evento('tls.expiring', { daysLeft: 5 })])[0]?.severity).toBe('high');
    expect(evaluateGuardianRules([evento('tls.expiring', { daysLeft: 15 })])[0]?.severity).toBe('warning');
  });

  it('a 60 días no hay nada que decir', () => {
    expect(evaluateGuardianRules([evento('tls.expiring', { daysLeft: 60 })])).toHaveLength(0);
  });
});

describe('agrupación de repeticiones', () => {
  it('doce lecturas del mismo disco lleno son UN hallazgo', () => {
    // El collector corre cada 5 min: sin agrupar, un informe diario tendría
    // cientos de líneas iguales y el problema real se perdería entre ellas.
    const eventos = Array.from({ length: 12 }, () => evento('system.disk', { usedPct: 91 }));
    const h = evaluateGuardianRules(eventos);
    expect(h).toHaveLength(1);
    expect(h[0]?.title).toContain('12 lecturas');
  });

  it('conserva toda la evidencia al agrupar', () => {
    const eventos = Array.from({ length: 5 }, () => evento('system.disk', { usedPct: 91 }));
    const h = evaluateGuardianRules(eventos);
    expect(h[0]?.evidenceEventIds).toHaveLength(5);
  });

  it('lo sostenido sube de severidad; lo puntual no', () => {
    const puntual = evaluateGuardianRules([evento('system.disk', { usedPct: 85 })]);
    expect(puntual[0]?.severity).toBe('warning');

    const sostenido = evaluateGuardianRules(
      Array.from({ length: 5 }, () => evento('system.disk', { usedPct: 85 })),
    );
    expect(sostenido[0]?.severity).toBe('high');
  });

  it('nunca baja de severidad al agrupar', () => {
    const eventos = Array.from({ length: 10 }, () => evento('system.service', { unit: 'x', state: 'inactive' }));
    expect(evaluateGuardianRules(eventos)[0]?.severity).toBe('critical');
  });

  it('ordena lo más grave primero', () => {
    const h = evaluateGuardianRules([
      evento('system.disk', { usedPct: 85 }),
      evento('system.service', { unit: 'x', state: 'inactive' }),
      evento('tls.expiring', { daysLeft: 15 }),
    ]);
    expect(h[0]?.severity).toBe('critical');
  });
});

describe('lo que NO detecta', () => {
  it('un tipo de evento sin regla no produce hallazgo', () => {
    // Inventar uno genérico llenaría el informe de ruido que nadie sabría
    // interpretar.
    expect(evaluateGuardianRules([evento('app.deploy', { version: 'abc123' })])).toHaveLength(0);
  });

  it('sin eventos no hay hallazgos', () => {
    expect(evaluateGuardianRules([])).toHaveLength(0);
  });

  it('un payload vacío no rompe nada', () => {
    expect(() => evaluateGuardianRules([evento('system.disk', {})])).not.toThrow();
  });
});

describe('severidad global', () => {
  it('es la del hallazgo más grave', () => {
    const h = evaluateGuardianRules([
      evento('system.disk', { usedPct: 85 }),
      evento('db.health', { status: 'down' }),
    ]);
    expect(overallSeverity(h)).toBe('critical');
  });

  it('sin hallazgos es info', () => {
    expect(overallSeverity([])).toBe('info');
  });
});
