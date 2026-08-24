/**
 * Scheduler, procesador de eventos y apagado ordenado.
 *
 * Lo que se prueba: la política de catch-up —cuántas ventanas perdidas se
 * recuperan tras una parada—, qué eventos merecen despertar a un agente, y que
 * el drenaje deja de aceptar trabajo en cuanto llega la señal.
 */

jest.mock('server-only', () => ({}));
jest.mock('@/lib/auth', () => ({ auth: {} }));
jest.mock('@/lib/db', () => ({ db: {}, getTransactionalDb: () => ({}) }));

import { EVENT_RULES, matchEventRule } from '@/lib/agents/worker/event-processor';
import { SCHEDULER_LOCK_ID, windowsToMaterialize } from '@/lib/agents/worker/scheduler';
import { createShutdownController } from '@/lib/agents/worker/shutdown';
import type { AgentEvent } from '@/types';

const AHORA = new Date('2026-07-15T12:00:00Z');

type ScheduleParcial = Parameters<typeof windowsToMaterialize>[0];

function rutina(over: Partial<ScheduleParcial> = {}): ScheduleParcial {
  return {
    cronExpression: '30 8 * * *',
    timezone: 'Europe/Madrid',
    catchUpPolicy: 'skip',
    maxCatchUpRuns: 1,
    nextRunAt: new Date('2026-07-15T06:30:00Z'),
    lastScheduledFor: new Date('2026-07-14T06:30:00Z'),
    ...over,
  };
}

describe('política de catch-up', () => {
  it('skip solo materializa la ventana actual, no lo perdido', () => {
    const ventanas = windowsToMaterialize(rutina({ catchUpPolicy: 'skip' }), AHORA);
    expect(ventanas).toHaveLength(1);
    expect(ventanas[0]?.toISOString()).toBe('2026-07-15T06:30:00.000Z');
  });

  it('skip no materializa nada si la ventana aún no venció', () => {
    const ventanas = windowsToMaterialize(
      rutina({ catchUpPolicy: 'skip', nextRunAt: new Date('2026-07-16T06:30:00Z') }),
      AHORA,
    );
    expect(ventanas).toEqual([]);
  });

  it('latest recupera solo la última tras una parada larga', () => {
    // Diez días caído no pueden convertirse en diez ejecuciones.
    const ventanas = windowsToMaterialize(
      rutina({ catchUpPolicy: 'latest', lastScheduledFor: new Date('2026-07-05T06:30:00Z') }),
      AHORA,
    );
    expect(ventanas).toHaveLength(1);
  });

  it('all_limited respeta su tope', () => {
    const ventanas = windowsToMaterialize(
      rutina({
        catchUpPolicy: 'all_limited',
        maxCatchUpRuns: 3,
        lastScheduledFor: new Date('2026-07-05T06:30:00Z'),
      }),
      AHORA,
    );
    expect(ventanas).toHaveLength(3);
  });

  it('ninguna política recupera "todo"', () => {
    // Un worker que vuelve tras una semana se comería el presupuesto del mes.
    const desdeLejos = new Date('2026-01-01T00:00:00Z');
    for (const politica of ['skip', 'latest', 'all_limited'] as const) {
      const ventanas = windowsToMaterialize(
        rutina({ catchUpPolicy: politica, maxCatchUpRuns: 5, lastScheduledFor: desdeLejos }),
        AHORA,
      );
      expect(ventanas.length).toBeLessThanOrEqual(5);
    }
  });

  it('una rutina sin referencia temporal no materializa nada', () => {
    expect(windowsToMaterialize(rutina({ nextRunAt: null, lastScheduledFor: null }), AHORA)).toEqual([]);
  });

  it('el identificador del advisory lock es una constante fija', () => {
    // Si cambiara entre despliegues, dos versiones del worker correrían el tick
    // a la vez sin saberlo.
    expect(SCHEDULER_LOCK_ID).toBe(8_421_071);
  });
});

function evento(over: Partial<AgentEvent> = {}): AgentEvent {
  return {
    id: 1,
    source: 'uptime',
    eventType: 'service.down',
    externalId: null,
    eventKey: 'uptime:service.down:1',
    severity: 'high',
    status: 'pending',
    payloadJson: {},
    fingerprint: null,
    occurredAt: AHORA,
    availableAt: AHORA,
    claimedBy: null,
    claimExpiresAt: null,
    processedAt: null,
    attempt: 0,
    lastError: null,
    createdAt: AHORA,
    ...over,
  };
}

describe('reglas de evento', () => {
  it('un evento grave despierta a Guardian', () => {
    expect(matchEventRule(evento({ severity: 'high' }))?.agentSlug).toBe('guardian');
    expect(matchEventRule(evento({ severity: 'critical' }))?.agentSlug).toBe('guardian');
  });

  it('un aviso o un informativo no despiertan a nadie', () => {
    // La mayoría de eventos acaban ignorados, y eso es lo normal: despertar a un
    // agente por cada latido gastaría el presupuesto del mes en un día.
    expect(matchEventRule(evento({ severity: 'info' }))).toBeNull();
    expect(matchEventRule(evento({ severity: 'warning' }))).toBeNull();
  });

  it('despierta al agente de dominio solo para sus eventos allowlisted', () => {
    expect(matchEventRule(evento({
      source: 'discord-pipeline',
      eventType: 'deal.draft_created',
      severity: 'info',
    }))?.agentSlug).toBe('deal-clerk');
    expect(matchEventRule(evento({
      source: 'google-search-console',
      eventType: 'seo.search_console_snapshot',
      severity: 'info',
    }))?.agentSlug).toBe('seo');
    expect(matchEventRule(evento({
      source: 'crm',
      eventType: 'lead.created',
      severity: 'info',
    }))?.agentSlug).toBe('growth');
  });

  it('una regla más específica gana si va antes', () => {
    const reglas = [
      { source: 'n8n', eventType: 'workflow.failed', minSeverity: 'warning' as const, agentSlug: 'dev' },
      ...EVENT_RULES,
    ];
    const e = evento({ source: 'n8n', eventType: 'workflow.failed', severity: 'warning' });
    expect(matchEventRule(e, reglas)?.agentSlug).toBe('dev');
  });

  it('un origen que no casa cae a la regla general', () => {
    const reglas = [
      { source: 'n8n', eventType: '*', minSeverity: 'info' as const, agentSlug: 'dev' },
      ...EVENT_RULES,
    ];
    expect(matchEventRule(evento({ source: 'github', severity: 'critical' }), reglas)?.agentSlug).toBe(
      'guardian',
    );
  });
});

describe('apagado ordenado', () => {
  it('no está drenando hasta que llega la señal', () => {
    const c = createShutdownController({ listenToSignals: false });
    expect(c.isDraining()).toBe(false);
    c.requestShutdown('test');
    expect(c.isDraining()).toBe(true);
    expect(c.reason()).toBe('test');
    c.dispose();
  });

  it('aborta la señal para que las tools en marcha corten', () => {
    const c = createShutdownController({ listenToSignals: false });
    expect(c.state.signal.aborted).toBe(false);
    c.requestShutdown('SIGTERM');
    expect(c.state.signal.aborted).toBe(true);
    c.dispose();
  });

  it('una segunda señal no reinicia el motivo', () => {
    const c = createShutdownController({ listenToSignals: false });
    c.requestShutdown('SIGTERM');
    c.requestShutdown('SIGINT');
    expect(c.reason()).toBe('SIGTERM');
    c.dispose();
  });

  it('espera al trabajo en curso y devuelve true si termina a tiempo', async () => {
    const c = createShutdownController({ listenToSignals: false });
    c.markBusy();
    setTimeout(() => c.markIdle(), 150);
    expect(await c.waitForDrain(2_000)).toBe(true);
    c.dispose();
  });

  it('devuelve false si el trabajo no termina dentro del plazo', async () => {
    // El worker se apaga igualmente: el lease vencerá y otro lo recogerá.
    const c = createShutdownController({ listenToSignals: false });
    c.markBusy();
    expect(await c.waitForDrain(200)).toBe(false);
    c.dispose();
  });

  it('sin trabajo en curso, drena de inmediato', async () => {
    const c = createShutdownController({ listenToSignals: false });
    expect(await c.waitForDrain(50)).toBe(true);
    c.dispose();
  });

  it('avisa por callback al recibir la señal', () => {
    const motivos: string[] = [];
    const c = createShutdownController({
      listenToSignals: false,
      onSignal: (m) => motivos.push(m),
    });
    c.requestShutdown('SIGTERM');
    expect(motivos).toEqual(['SIGTERM']);
    c.dispose();
  });
});
