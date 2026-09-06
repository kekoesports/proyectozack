import { sql } from 'drizzle-orm';
import { pgTable, uuid, integer, text, timestamp, jsonb, uniqueIndex, index, check } from 'drizzle-orm/pg-core';
import { studioProjects, studioAssets } from './studio';
import { talents } from './talents';
import { user } from './auth';

/** Declarative timelines only. No user HTML, command lines, URLs or executable code. */
export const studioBoards = pgTable('studio_boards', {
  projectId: uuid('project_id').primaryKey().references(() => studioProjects.id, { onDelete: 'cascade' }),
  revision: integer('revision').notNull().default(0),
  document: jsonb('document').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** One durable request/response per turn. A retry uses the same id and cannot call AI twice. */
export const studioChatTurns = pgTable('studio_chat_turns', {
  id: uuid('id').primaryKey(),
  projectId: uuid('project_id').notNull().references(() => studioProjects.id, { onDelete: 'cascade' }),
  projectRevision: integer('project_revision').notNull(),
  prompt: text('prompt').notNull(),
  response: text('response'),
  proposal: jsonb('proposal'),
  status: text('status').notNull().default('pending'),
  engine: text('engine').notNull(),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('studio_chat_project_idx').on(t.projectId, t.createdAt),
  check('studio_chat_status_ck', sql`${t.status} in ('pending','complete','failed')`)]);

/** Snapshots are immutable: edits create a different render, never overwrite the approved master. */
export const studioRenders = pgTable('studio_renders', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => studioProjects.id, { onDelete: 'restrict' }),
  projectRevision: integer('project_revision').notNull(),
  boardRevision: integer('board_revision').notNull(),
  document: jsonb('document').notNull(),
  status: text('status').notNull().default('queued'),
  assetId: uuid('asset_id').references(() => studioAssets.id, { onDelete: 'restrict' }),
  requestedBy: text('requested_by').notNull().references(() => user.id, { onDelete: 'restrict' }),
  reviewedBy: text('reviewed_by').references(() => user.id, { onDelete: 'restrict' }),
  reviewNote: text('review_note'),
  failureCode: text('failure_code'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('studio_render_revision_uq').on(t.projectId, t.projectRevision, t.boardRevision),
  index('studio_render_queue_idx').on(t.status, t.createdAt),
  check('studio_render_status_ck', sql`${t.status} in ('queued','rendering','ready','failed','approved','changes_requested')`),
]);

/** User-declared handles are not OAuth connections. Verification evidence lives separately. */
export const studioChannels = pgTable('studio_channels', {
  id: uuid('id').primaryKey().defaultRandom(),
  talentId: integer('talent_id').notNull().references(() => talents.id, { onDelete: 'restrict' }),
  platform: text('platform').notNull(),
  handle: text('handle').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('studio_channel_talent_platform_uq').on(t.talentId, t.platform)]);

export const studioChannelObservations = pgTable('studio_channel_observations', {
  id: uuid('id').primaryKey().defaultRandom(),
  channelId: uuid('channel_id').notNull().references(() => studioChannels.id, { onDelete: 'cascade' }),
  document: jsonb('document').notNull(),
  collectedAt: timestamp('collected_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('studio_channel_observation_idx').on(t.channelId, t.collectedAt)]);

/** Planning only. A publication URL is recorded by a human; no posting credentials here. */
export const studioSchedule = pgTable('studio_schedule', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => studioProjects.id, { onDelete: 'cascade' }),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  publishedUrl: text('published_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('studio_schedule_project_uq').on(t.projectId)]);
