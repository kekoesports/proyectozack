import { pgTable, uuid, integer, text, timestamp, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { studioProjects, studioAssets } from './studio';
import { user } from './auth';
/** The approved text and quote are immutable once submission starts. No implicit provider retries. */
export const studioNarrations = pgTable('studio_narrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => studioProjects.id, { onDelete: 'restrict' }),
  projectRevision: integer('project_revision').notNull(),
  text: text('text').notNull(),
  voiceId: uuid('voice_id').notNull(),
  status: text('status').notNull().default('quote_requested'),
  creditsMilli: integer('credits_milli'),
  quotedAt: timestamp('quoted_at', { withTimezone: true }),
  approvedBy: text('approved_by').references(() => user.id, { onDelete: 'restrict' }),
  requestedBy: text('requested_by').notNull().references(() => user.id, { onDelete: 'restrict' }),
  providerJobId: uuid('provider_job_id'),
  assetId: uuid('asset_id').references(() => studioAssets.id, { onDelete: 'restrict' }),
  failureCode: text('failure_code'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('studio_narration_revision_uq').on(t.projectId, t.projectRevision),
  check('studio_narration_status_ck', sql`${t.status} in ('quote_requested','quoting','quoted','approved','submitting','complete','failed','uncertain')`),
  check('studio_narration_cost_ck', sql`${t.creditsMilli} IS NULL OR ${t.creditsMilli} >= 0`)]);
