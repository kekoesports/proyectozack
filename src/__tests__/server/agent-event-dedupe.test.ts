/**
 * Deduplicación de señales entrantes.
 *
 * La garantía real la da el índice único `agent_events_event_key_uq` (cubierto
 * en agent-schema-constraints.test.ts). Aquí se prueba la otra mitad: que la
 * misma señal produce siempre la misma clave y que el repositorio reconoce el
 * conflicto en vez de tratarlo como error.
 */

jest.mock('server-only', () => ({}));

const mockInsert = jest.fn();
const mockSelect = jest.fn();
jest.mock('@/lib/db', () => ({ db: { insert: mockInsert, select: mockSelect } }));
jest.mock('@/lib/auth', () => ({ auth: {} }));

import {
  EVENT_KEY_MAX_LENGTH,
  IDEMPOTENCY_KEY_MAX_LENGTH,
  buildAgentEventKey,
  buildRunIdempotencyKey,
  buildScheduleIdempotencyKey,
} from '@/lib/agents/keys';
import { ingestAgentEvent } from '@/lib/queries/agents/events';

describe('buildAgentEventKey', () => {
  it('es determinista', () => {
    const args = { source: 'uptime', eventType: 'service.down', externalId: 'inc-42' };
    expect(buildAgentEventKey(args)).toBe(buildAgentEventKey(args));
  });

  it('normaliza el vocabulario controlado', () => {
    expect(buildAgentEventKey({ source: '  Uptime ', eventType: 'Service Down', externalId: 'x' })).toBe(
      buildAgentEventKey({ source: 'uptime', eventType: 'service-down', externalId: 'x' }),
    );
  });

  it('NO normaliza el identificador externo a minúsculas', () => {
    // Un ID de GitHub o Discord distingue mayúsculas: fusionarlos descartaría
    // señales distintas como si fueran la misma.
    const a = buildAgentEventKey({ source: 'github', eventType: 'run.failed', externalId: 'AbC' });
    const b = buildAgentEventKey({ source: 'github', eventType: 'run.failed', externalId: 'abc' });
    expect(a).not.toBe(b);
  });

  it('distingue eventos por tipo y por origen', () => {
    const base = { eventType: 'service.down', externalId: 'inc-1' };
    expect(buildAgentEventKey({ ...base, source: 'uptime' })).not.toBe(
      buildAgentEventKey({ ...base, source: 'n8n' }),
    );
  });

  it('sin ID externo se apoya en el contenido', () => {
    const a = buildAgentEventKey({ source: 'collector', eventType: 'disk.usage', payloadDigest: '{"pct":91}' });
    const b = buildAgentEventKey({ source: 'collector', eventType: 'disk.usage', payloadDigest: '{"pct":92}' });
    expect(a).not.toBe(b);
    expect(a).toBe(
      buildAgentEventKey({ source: 'collector', eventType: 'disk.usage', payloadDigest: '{"pct":91}' }),
    );
  });

  it('respeta el ancho de la columna sin perder unicidad al recortar', () => {
    const prefijo = 'x'.repeat(400);
    const a = buildAgentEventKey({ source: 'n8n', eventType: 'workflow.failed', externalId: `${prefijo}A` });
    const b = buildAgentEventKey({ source: 'n8n', eventType: 'workflow.failed', externalId: `${prefijo}B` });
    expect(a.length).toBeLessThanOrEqual(EVENT_KEY_MAX_LENGTH);
    expect(b.length).toBeLessThanOrEqual(EVENT_KEY_MAX_LENGTH);
    expect(a).not.toBe(b);
  });

  it('rechaza origen o tipo vacíos', () => {
    expect(() => buildAgentEventKey({ source: '  ', eventType: 'x' })).toThrow();
    expect(() => buildAgentEventKey({ source: 'x', eventType: '' })).toThrow();
  });
});

describe('buildRunIdempotencyKey', () => {
  it('descarta partes vacías', () => {
    expect(buildRunIdempotencyKey(['manual', '', 'x'])).toBe(buildRunIdempotencyKey(['manual', 'x']));
  });

  it('rechaza una lista sin ninguna parte útil', () => {
    expect(() => buildRunIdempotencyKey([' ', ''])).toThrow();
  });

  it('cabe en la columna aunque las partes sean enormes', () => {
    const key = buildRunIdempotencyKey(['event', 'y'.repeat(500)]);
    expect(key.length).toBeLessThanOrEqual(IDEMPOTENCY_KEY_MAX_LENGTH);
  });
});

describe('buildScheduleIdempotencyKey', () => {
  it('una ventana produce siempre la misma clave', () => {
    const ventana = new Date('2026-08-21T06:30:00.000Z');
    expect(buildScheduleIdempotencyKey('guardian-daily', ventana)).toBe(
      'schedule:guardian-daily:2026-08-21T06:30:00.000Z',
    );
  });

  it('dos ventanas distintas no colisionan', () => {
    expect(buildScheduleIdempotencyKey('guardian-daily', new Date('2026-08-21T06:30:00Z'))).not.toBe(
      buildScheduleIdempotencyKey('guardian-daily', new Date('2026-08-22T06:30:00Z')),
    );
  });

  it('rechaza una fecha inválida', () => {
    expect(() => buildScheduleIdempotencyKey('guardian-daily', new Date('no-es-fecha'))).toThrow();
  });
});

// ── Repositorio ──────────────────────────────────────────────────────────────

type FilaEvento = { id: number; eventKey: string };

function stubInsert(devuelve: readonly FilaEvento[]): void {
  mockInsert.mockReturnValue({
    values: () => ({
      onConflictDoNothing: () => ({ returning: async () => devuelve }),
    }),
  });
}

function stubSelect(devuelve: readonly FilaEvento[]): void {
  mockSelect.mockReturnValue({
    from: () => ({ where: () => ({ limit: async () => devuelve }) }),
  });
}

describe('ingestAgentEvent', () => {
  beforeEach(() => {
    mockInsert.mockReset();
    mockSelect.mockReset();
  });

  it('registra una señal nueva', async () => {
    stubInsert([{ id: 1, eventKey: 'uptime:service.down:inc-9' }]);
    const res = await ingestAgentEvent({ source: 'uptime', eventType: 'service.down', externalId: 'inc-9' });
    expect(res.deduplicated).toBe(false);
    expect(res.event.id).toBe(1);
  });

  it('reconoce el duplicado y devuelve la fila existente', async () => {
    // Postgres no devuelve fila en el conflicto: el repositorio recupera la
    // original en vez de propagar un error.
    stubInsert([]);
    stubSelect([{ id: 1, eventKey: 'uptime:service.down:inc-9' }]);
    const res = await ingestAgentEvent({ source: 'uptime', eventType: 'service.down', externalId: 'inc-9' });
    expect(res.deduplicated).toBe(true);
    expect(res.event.id).toBe(1);
  });

  it('falla si hay conflicto pero no existe la fila previa', async () => {
    stubInsert([]);
    stubSelect([]);
    await expect(
      ingestAgentEvent({ source: 'uptime', eventType: 'service.down', externalId: 'inc-9' }),
    ).rejects.toThrow(/conflicto sin fila previa/i);
  });
});
