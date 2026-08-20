import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

import { agentEventSeverityEnum, agentEventStatusEnum } from './agentEnums';

/**
 * Inbox durable de señales externas (uptime, n8n, GitHub, collectors).
 *
 * El modelo nunca recibe un webhook crudo: la señal entra aquí validada,
 * redactada y deduplicada por `event_key`, y solo después una regla
 * determinista decide si merece una ejecución.
 *
 * Desviación deliberada de docs/agent-os/data-model.md §9: la tabla NO lleva
 * `run_id`. La relación evento → ejecución vive en `agent_runs.source_event_id`
 * (con índice propio), que además admite varias ejecuciones por evento. Tener
 * las dos direcciones obligaba a un ciclo de imports entre este módulo y
 * `agentRuns.ts` sin aportar información nueva.
 */
export const agentEvents = pgTable(
  'agent_events',
  {
    id: serial('id').primaryKey(),
    source: varchar('source', { length: 80 }).notNull(),
    /** Allowlisted en el ingestor; la columna no valida por sí sola. */
    eventType: varchar('event_type', { length: 120 }).notNull(),
    externalId: varchar('external_id', { length: 240 }),
    /** Clave de deduplicación. Ver `buildAgentEventKey` en src/lib/agents/keys.ts. */
    eventKey: varchar('event_key', { length: 320 }).notNull(),
    severity: agentEventSeverityEnum('severity').notNull().default('info'),
    status: agentEventStatusEnum('status').notNull().default('pending'),
    /** Payload ya validado con Zod y pasado por el redactor. */
    payloadJson: jsonb('payload_json').$type<Record<string, unknown>>().notNull().default({}),
    /** Agrupa incidencias repetidas del mismo síntoma. */
    fingerprint: varchar('fingerprint', { length: 160 }),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    availableAt: timestamp('available_at', { withTimezone: true }).notNull().defaultNow(),
    claimedBy: varchar('claimed_by', { length: 120 }),
    claimExpiresAt: timestamp('claim_expires_at', { withTimezone: true }),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    attempt: integer('attempt').notNull().default(0),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('agent_events_event_key_uq').on(t.eventKey),
    index('agent_events_pending_idx').on(t.status, t.availableAt),
    index('agent_events_fingerprint_idx').on(t.fingerprint, t.occurredAt),
    index('agent_events_source_type_idx').on(t.source, t.eventType, t.occurredAt),
    index('agent_events_severity_idx').on(t.severity, t.status, t.occurredAt),
    check('agent_events_attempt_ck', sql`${t.attempt} >= 0`),
  ],
);
