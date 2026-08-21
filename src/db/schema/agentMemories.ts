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
  varchar,
} from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

import { agentDefinitions } from './agentDefinitions';
import {
  agentMemoryScopeEnum,
  agentMemorySensitivityEnum,
  agentMemoryVerificationEnum,
} from './agentEnums';
import { user } from './auth';

/**
 * Memoria curada: hechos estables, no un volcado del chat.
 *
 * Cada hecho declara de dónde sale, quién lo verificó, cuánto vale y hasta
 * cuándo. Lo que NO va aquí: importes de campañas, NIF/IBAN, secretos,
 * contratos completos ni nada que deba leerse vivo del CRM. Ese es el punto
 * del sistema — la memoria no sustituye a una consulta.
 *
 * Sin embeddings en esta fase: scope + clave + texto bastan para el volumen
 * actual, y añadir una base vectorial antes de necesitarla es deuda.
 *
 * Ver docs/agent-os/data-model.md §10.
 */
export const agentMemories = pgTable(
  'agent_memories',
  {
    id: serial('id').primaryKey(),
    scope: agentMemoryScopeEnum('scope').notNull(),
    /** Obligatorio cuando `scope = 'user'`. */
    scopeUserId: text('scope_user_id').references(() => user.id, { onDelete: 'cascade' }),
    /** Obligatorio cuando `scope = 'agent'`. */
    agentId: integer('agent_id').references(() => agentDefinitions.id, { onDelete: 'cascade' }),
    memoryKey: varchar('memory_key', { length: 180 }).notNull(),
    /** Contenido redactado. */
    content: text('content').notNull(),
    contentJson: jsonb('content_json').$type<Record<string, unknown>>(),
    sensitivity: agentMemorySensitivityEnum('sensitivity').notNull().default('internal'),
    verificationStatus: agentMemoryVerificationEnum('verification_status').notNull().default('proposed'),
    confidencePct: integer('confidence_pct'),
    /** policy, user, document, run... */
    sourceType: varchar('source_type', { length: 80 }).notNull(),
    /** Referencia interna segura. Nunca una URL con token. */
    sourceRef: text('source_ref'),
    validFrom: timestamp('valid_from', { withTimezone: true }).notNull().defaultNow(),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    supersedesMemoryId: integer('supersedes_memory_id').references(
      (): AnyPgColumn => agentMemories.id,
      { onDelete: 'set null' },
    ),
    createdByUserId: text('created_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    verifiedByUserId: text('verified_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('agent_memories_scope_idx').on(t.scope, t.scopeUserId, t.agentId, t.memoryKey),
    index('agent_memories_validity_idx').on(t.verificationStatus, t.validUntil),
    index('agent_memories_agent_idx').on(t.agentId, t.verificationStatus),
    // Un hecho de scope `user` sin usuario sería visible para todos: el check
    // es lo que impide que una fuga de scope dependa del código de turno.
    check('agent_memories_user_scope_ck', sql`${t.scope} <> 'user' OR ${t.scopeUserId} IS NOT NULL`),
    check('agent_memories_agent_scope_ck', sql`${t.scope} <> 'agent' OR ${t.agentId} IS NOT NULL`),
    check(
      'agent_memories_confidence_ck',
      sql`${t.confidencePct} IS NULL OR (${t.confidencePct} >= 0 AND ${t.confidencePct} <= 100)`,
    ),
    check('agent_memories_validity_ck', sql`${t.validUntil} IS NULL OR ${t.validUntil} > ${t.validFrom}`),
    // Verificado sin verificador es una verificación que nadie firmó.
    check(
      'agent_memories_verified_by_ck',
      sql`${t.verificationStatus} <> 'verified' OR ${t.verifiedByUserId} IS NOT NULL`,
    ),
  ],
);
