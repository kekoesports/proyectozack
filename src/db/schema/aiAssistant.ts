import { pgEnum, pgTable, serial, text, integer, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { user } from './auth';

export const aiContextTypeEnum = pgEnum('ai_context_type', [
  'general', 'facturacion', 'campanas', 'talentos', 'marcas', 'finanzas',
]);

export const aiMessageRoleEnum = pgEnum('ai_message_role', [
  'user', 'assistant', 'system',
]);

export const aiToolExecutionStatusEnum = pgEnum('ai_tool_execution_status', [
  'success', 'error', 'blocked',
]);

// ── Hilos de conversación ─────────────────────────────────────────────

export const aiAssistantThreads = pgTable('ai_assistant_threads', {
  id: serial('id').primaryKey(),
  title: text('title').notNull().default('Nueva conversación'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  contextType: aiContextTypeEnum('context_type').default('general'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('ai_threads_user_idx').on(t.userId),
  index('ai_threads_created_idx').on(t.createdAt),
]);

// ── Mensajes de conversación ──────────────────────────────────────────

export const aiAssistantMessages = pgTable('ai_assistant_messages', {
  id: serial('id').primaryKey(),
  threadId: integer('thread_id').notNull().references(() => aiAssistantThreads.id, { onDelete: 'cascade' }),
  role: aiMessageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('ai_messages_thread_idx').on(t.threadId),
  index('ai_messages_thread_created_idx').on(t.threadId, t.createdAt),
]);

// ── Registro de ejecuciones de tools ─────────────────────────────────

export const aiToolExecutions = pgTable('ai_tool_executions', {
  id: serial('id').primaryKey(),
  threadId: integer('thread_id').notNull().references(() => aiAssistantThreads.id, { onDelete: 'cascade' }),
  messageId: integer('message_id').references(() => aiAssistantMessages.id, { onDelete: 'set null' }),
  toolName: text('tool_name').notNull(),
  inputJson: jsonb('input_json'),
  outputJson: jsonb('output_json'),
  status: aiToolExecutionStatusEnum('status').notNull().default('success'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('ai_tool_exec_thread_idx').on(t.threadId),
  index('ai_tool_exec_created_idx').on(t.createdAt),
]);
