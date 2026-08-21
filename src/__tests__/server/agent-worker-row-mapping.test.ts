/**
 * Mapeo de las filas crudas del claim.
 *
 * `db.execute()` con SQL escrito a mano devuelve las columnas **como se llaman
 * en Postgres** —`agent_id`, `max_attempts`, `event_key`—, no con los nombres
 * del schema TypeScript. El query builder de Drizzle sí traduce; `execute` no.
 *
 * Sin el mapeo, `run.agentId` llegaba `undefined`: el worker no encontraba el
 * agente, devolvía la ejecución a la cola y volvía a intentarlo, subiendo
 * `attempt` en cada vuelta hasta dejarla atascada. Y la firma decía `AgentRun`,
 * así que TypeScript no podía verlo — el tipo prometía una forma que el runtime
 * no cumplía.
 *
 * **Ningún test lo cogía** porque todos mockean `db.execute` y devuelven ya el
 * objeto en camelCase. Se descubrió ejecutando el worker contra la base.
 */

jest.mock('server-only', () => ({}));
jest.mock('@/lib/db', () => ({ db: {}, getTransactionalDb: () => ({}) }));
jest.mock('@/lib/auth', () => ({ auth: {} }));

import { mapAgentRunRow } from '@/lib/agents/worker/claim';
import { mapAgentEventRow } from '@/lib/agents/worker/event-processor';

/** Una fila tal como la devuelve Postgres, con los nombres de las columnas. */
const FILA_RUN = {
  id: 7,
  agent_id: 3,
  trigger_type: 'schedule',
  triggered_by_user_id: null,
  parent_run_id: null,
  source_event_id: 12,
  thread_id: null,
  status: 'running',
  priority: 5,
  idempotency_key: 'schedule:guardian-daily:2026-08-21T06:30:00.000Z',
  correlation_id: 'c-42',
  input_json: { windowHours: 24 },
  output_summary: null,
  state_json: {},
  available_at: '2026-08-21T10:00:00.000Z',
  scheduled_for: '2026-08-21T06:30:00.000Z',
  started_at: '2026-08-21T10:00:01.000Z',
  completed_at: null,
  cancel_requested_at: null,
  attempt: 2,
  max_attempts: 3,
  lease_owner: 'worker-1',
  lease_expires_at: '2026-08-21T10:01:00.000Z',
  next_step_sequence: 4,
  model_turns: 2,
  tool_calls: 3,
  input_tokens: 1_500,
  output_tokens: 400,
  estimated_cost_micros: 310_000,
  last_error_code: null,
  last_error_message: null,
  created_at: '2026-08-21T09:59:00.000Z',
  updated_at: '2026-08-21T10:00:01.000Z',
};

describe('mapAgentRunRow', () => {
  const run = mapAgentRunRow(FILA_RUN);

  it('traduce agentId, que es el campo que rompía el worker', () => {
    expect(run.agentId).toBe(3);
    expect(run.agentId).not.toBeUndefined();
  });

  it('traduce los campos que usa la política de reintentos', () => {
    expect(run.attempt).toBe(2);
    expect(run.maxAttempts).toBe(3);
  });

  it('traduce los campos que usa el lease', () => {
    expect(run.leaseOwner).toBe('worker-1');
    expect(run.leaseExpiresAt).toBeInstanceOf(Date);
  });

  it('traduce el input, del que sale el mensaje inicial', () => {
    expect(run.inputJson).toEqual({ windowHours: 24 });
    expect(run.correlationId).toBe('c-42');
  });

  it('convierte las marcas de tiempo a Date, no las deja como cadena', () => {
    // Comparar cadenas con `new Date()` daría siempre falso y la recuperación
    // de leases nunca dispararía.
    expect(run.createdAt).toBeInstanceOf(Date);
    expect(run.startedAt).toBeInstanceOf(Date);
    expect(run.availableAt).toBeInstanceOf(Date);
  });

  it('conserva los nulos como nulos', () => {
    expect(run.completedAt).toBeNull();
    expect(run.triggeredByUserId).toBeNull();
    expect(run.parentRunId).toBeNull();
    expect(run.lastErrorCode).toBeNull();
  });

  it('no deja ningún campo undefined', () => {
    // Un `undefined` suelto es exactamente lo que provocó el fallo: no rompe
    // nada al leerlo, y falla mucho después en una comparación silenciosa.
    for (const [clave, valor] of Object.entries(run)) {
      expect([clave, valor === undefined]).toEqual([clave, false]);
    }
  });

  it('sobrevive a una fila incompleta sin romper el tipo', () => {
    const parcial = mapAgentRunRow({ id: 1, agent_id: 2, status: 'queued' });
    expect(parcial.attempt).toBe(0);
    expect(parcial.createdAt).toBeInstanceOf(Date);
    expect(parcial.inputJson).toEqual({});
  });
});

const FILA_EVENTO = {
  id: 9,
  source: 'collector',
  event_type: 'system.disk',
  external_id: 'disk-20260821T1000',
  event_key: 'collector:system.disk:disk-20260821T1000',
  severity: 'critical',
  status: 'claimed',
  payload_json: { usedPct: 91 },
  fingerprint: null,
  occurred_at: '2026-08-21T10:00:00.000Z',
  available_at: '2026-08-21T10:00:00.000Z',
  claimed_by: 'worker-1',
  claim_expires_at: '2026-08-21T10:01:00.000Z',
  processed_at: null,
  attempt: 0,
  last_error: null,
  created_at: '2026-08-21T10:00:00.000Z',
};

describe('mapAgentEventRow', () => {
  const evento = mapAgentEventRow(FILA_EVENTO);

  it('traduce eventKey, del que sale la clave de idempotencia', () => {
    // Sin esto, la clave del run que genera el evento salía como
    // `event:undefined` —la misma para todos— y el segundo evento se habría
    // descartado como duplicado del primero.
    expect(evento.eventKey).toBe('collector:system.disk:disk-20260821T1000');
  });

  it('traduce eventType y payload, que van al input del run', () => {
    expect(evento.eventType).toBe('system.disk');
    expect(evento.payloadJson).toEqual({ usedPct: 91 });
  });

  it('traduce la severidad, de la que depende si despierta a un agente', () => {
    expect(evento.severity).toBe('critical');
  });

  it('no deja ningún campo undefined', () => {
    for (const [clave, valor] of Object.entries(evento)) {
      expect([clave, valor === undefined]).toEqual([clave, false]);
    }
  });
});
