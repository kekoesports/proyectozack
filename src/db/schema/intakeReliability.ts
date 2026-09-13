import { bigserial, index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import type { IntakeWahaUpdate } from '@/lib/schemas/intakeWaha';
import { intakeConversations } from './creatorIntake';

// Aliases are scoped to the company session. Never infer a phone from a LID.
export const intakePeerAliases = pgTable('intake_peer_aliases', {
  key: varchar('key', { length: 240 }).primaryKey(),
  conversationId: uuid('conversation_id').notNull().references(() => intakeConversations.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('intake_peer_alias_conversation_idx').on(t.conversationId)]);

// Persist before acknowledging the provider. State and retries survive container loss.
export const intakeInbox = pgTable('intake_inbox', {
  id: varchar('id', { length: 64 }).primaryKey(),
  sequence: bigserial('sequence', { mode: 'number' }).notNull(),
  fingerprint: varchar('fingerprint', { length: 64 }).notNull(),
  payload: jsonb('payload').$type<IntakeWahaUpdate>().notNull(),
  status: varchar('status', { length: 24 }).notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  reason: varchar('reason', { length: 80 }),
  result: text('result'),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
  leaseUntil: timestamp('lease_until', { withTimezone: true }),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
}, (t) => [index('intake_inbox_queue_idx').on(t.status, t.nextAttemptAt)]);
