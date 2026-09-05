import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import type { CreatorSearchConfig, CreatorObservation, CreatorPlatform } from '@/lib/schemas/creator-search-profile';
import { user } from './auth';
import { targets } from './targets';
import { talents } from './talents';

export const creatorSearchProfiles = pgTable('creator_search_profiles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  config: jsonb('config').$type<CreatorSearchConfig>().notNull(),
  enabled: boolean('enabled').notNull().default(false),
  version: integer('version').notNull().default(1),
  nextRunAt: timestamp('next_run_at', { withTimezone: true }),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  leaseToken: varchar('lease_token', { length: 36 }),
  leaseUntil: timestamp('lease_until', { withTimezone: true }),
  createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('creator_search_profile_name_key').on(t.name), index('creator_search_profile_due_idx').on(t.enabled, t.nextRunAt)]);

export const creatorIdentities = pgTable('creator_identities', {
  id: serial('id').primaryKey(),
  displayName: varchar('display_name', { length: 300 }).notNull(),
  talentId: integer('talent_id').references(() => talents.id, { onDelete: 'set null' }),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  timesObserved: integer('times_observed').notNull().default(1),
  sourceFirstSeen: varchar('source_first_seen', { length: 200 }).notNull(),
  sourceLastSeen: varchar('source_last_seen', { length: 200 }).notNull(),
}, (t) => [index('creator_identity_talent_idx').on(t.talentId)]);

// One immutable provider ID per account; similar usernames alone never merge people.
export const creatorAccounts = pgTable('creator_accounts', {
  id: serial('id').primaryKey(),
  creatorId: integer('creator_id').notNull().references(() => creatorIdentities.id),
  targetId: integer('target_id').references(() => targets.id, { onDelete: 'set null' }),
  platform: varchar('platform', { length: 20 }).$type<CreatorPlatform>().notNull(),
  externalId: varchar('external_id', { length: 200 }).notNull(),
  username: varchar('username', { length: 200 }).notNull(),
  profileUrl: text('profile_url').notNull(),
  identityEvidence: jsonb('identity_evidence').$type<{ confidence: 'HIGH' | 'MEDIUM' | 'LOW'; source: string; reason: string }>().notNull(),
  fields: jsonb('fields').$type<Record<string, CreatorObservation>>().notNull().default({}),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  timesObserved: integer('times_observed').notNull().default(1),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
}, (t) => [uniqueIndex('creator_account_provider_key').on(t.platform, t.externalId), uniqueIndex('creator_account_target_key').on(t.targetId), index('creator_account_person_idx').on(t.creatorId)]);

export const creatorFeedback = pgTable('creator_feedback', {
  id: serial('id').primaryKey(),
  targetId: integer('target_id').references(() => targets.id, { onDelete: 'set null' }),
  creatorId: integer('creator_id').references(() => creatorIdentities.id, { onDelete: 'set null' }),
  actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
  previousStatus: varchar('previous_status', { length: 24 }).notNull(),
  status: varchar('status', { length: 24 }).notNull(),
  reason: varchar('reason', { length: 40 }).notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('creator_feedback_target_idx').on(t.targetId, t.createdAt)]);

export type AutomationHealth = 'HEALTHY' | 'DEGRADED' | 'ERROR' | 'PAUSED' | 'NEVER_RUN';
export const automationRegistry = pgTable('automation_registry', {
  key: varchar('key', { length: 100 }).primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  type: varchar('type', { length: 40 }).notNull(),
  purpose: text('purpose').notNull(),
  status: varchar('status', { length: 20 }).$type<AutomationHealth>().notNull().default('NEVER_RUN'),
  enabled: boolean('enabled').notNull().default(false),
  lastStartedAt: timestamp('last_started_at', { withTimezone: true }),
  lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
  lastErrorAt: timestamp('last_error_at', { withTimezone: true }),
  lastError: text('last_error'),
  nextRunAt: timestamp('next_run_at', { withTimezone: true }),
  durationMs: integer('duration_ms'),
  itemsProcessed: integer('items_processed'),
  // Unknown cost/quota stays null, never presented as a verified zero.
  usage: jsonb('usage').$type<{ requests: number | null; searchUnits: number | null; generalUnits: number | null; costEur: number | null; source: string }>(),
  version: varchar('version', { length: 100 }).notNull(),
  evidence: text('evidence'),
  observedAt: timestamp('observed_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Evidence records only: API credentials and user permission to operate the CRM
// do not themselves establish a provider's commercial-use/retention permission.
export const creatorProviderPermissions = pgTable('creator_provider_permissions', {
  platform: varchar('platform', { length: 20 }).$type<CreatorPlatform>().primaryKey(),
  commercialApproved: boolean('commercial_approved').notNull().default(false),
  derivedMetricsApproved: boolean('derived_metrics_approved').notNull().default(false),
  retentionDays: integer('retention_days').notNull().default(0),
  evidenceRef: text('evidence_ref'),
  reviewedBy: text('reviewed_by').references(() => user.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  validUntil: timestamp('valid_until', { withTimezone: true }),
});
