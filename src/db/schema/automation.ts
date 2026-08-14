import { relations } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { campaigns } from './campaigns';
import { crmBrands } from './crmBrands';
import { talents } from './talents';

export const communicationChannelEnum = pgEnum('communication_channel', [
  'email',
  'telegram',
  'discord',
  'whatsapp',
  'phone',
  'meeting',
  'system',
  'other',
]);

export const communicationDirectionEnum = pgEnum('communication_direction', [
  'inbound',
  'outbound',
  'internal',
]);

export const communicationDraftStatusEnum = pgEnum('communication_draft_status', [
  'pending_approval',
  'approved',
  'rejected',
  'sending',
  'sent',
  'failed',
]);

export const automationEventStatusEnum = pgEnum('automation_event_status', [
  'pending',
  'processing',
  'delivered',
  'failed',
  'dead_letter',
]);

export const automationRiskLevelEnum = pgEnum('automation_risk_level', [
  'low',
  'medium',
  'high',
  'critical',
]);

/** Immutable operational timeline. External systems append through API v1 only. */
export const crmActivities = pgTable(
  'crm_activities',
  {
    id: serial('id').primaryKey(),
    brandId: integer('brand_id').references(() => crmBrands.id, { onDelete: 'set null' }),
    campaignId: integer('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
    talentId: integer('talent_id').references(() => talents.id, { onDelete: 'set null' }),
    entityType: varchar('entity_type', { length: 40 }).notNull(),
    entityId: varchar('entity_id', { length: 100 }).notNull(),
    activityType: varchar('activity_type', { length: 80 }).notNull(),
    channel: communicationChannelEnum('channel').notNull().default('system'),
    direction: communicationDirectionEnum('direction').notNull().default('internal'),
    summary: text('summary').notNull(),
    detail: text('detail'),
    source: varchar('source', { length: 50 }).notNull().default('socialpro'),
    externalId: varchar('external_id', { length: 200 }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    createdByUserId: text('created_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('crm_activities_entity_idx').on(t.entityType, t.entityId),
    index('crm_activities_brand_idx').on(t.brandId),
    index('crm_activities_campaign_idx').on(t.campaignId),
    index('crm_activities_occurred_idx').on(t.occurredAt),
    uniqueIndex('crm_activities_source_external_uniq').on(t.source, t.externalId),
  ],
);

/** Transactional outbox: application state and event intent are committed together. */
export const automationEventOutbox = pgTable(
  'automation_event_outbox',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventType: varchar('event_type', { length: 120 }).notNull(),
    aggregateType: varchar('aggregate_type', { length: 50 }).notNull(),
    aggregateId: varchar('aggregate_id', { length: 100 }).notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    status: automationEventStatusEnum('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(8),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    idempotencyKey: varchar('idempotency_key', { length: 200 }).notNull(),
    traceId: uuid('trace_id').notNull().defaultRandom(),
    lastErrorCode: varchar('last_error_code', { length: 80 }),
    lastResponseMeta: jsonb('last_response_meta').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('automation_outbox_idempotency_uniq').on(t.idempotencyKey),
    index('automation_outbox_dispatch_idx').on(t.status, t.nextAttemptAt),
    index('automation_outbox_locked_idx').on(t.lockedAt),
    index('automation_outbox_aggregate_idx').on(t.aggregateType, t.aggregateId),
  ],
);

export const automationWebhookDeliveries = pgTable(
  'automation_webhook_deliveries',
  {
    id: serial('id').primaryKey(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => automationEventOutbox.id, { onDelete: 'cascade' }),
    attempt: integer('attempt').notNull(),
    outcome: varchar('outcome', { length: 30 }).notNull(),
    statusCode: integer('status_code'),
    durationMs: integer('duration_ms'),
    responseMeta: jsonb('response_meta').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('automation_deliveries_event_idx').on(t.eventId),
    index('automation_deliveries_created_idx').on(t.createdAt),
  ],
);

/** Durable per-token, per-minute limiter for the integration API. */
export const integrationApiRateLimits = pgTable(
  'integration_api_rate_limits',
  {
    tokenFingerprint: varchar('token_fingerprint', { length: 64 }).notNull(),
    windowStartedAt: timestamp('window_started_at', { withTimezone: true }).notNull(),
    requestCount: integer('request_count').notNull().default(1),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.tokenFingerprint, t.windowStartedAt] }),
    index('integration_rate_limits_updated_idx').on(t.updatedAt),
  ],
);

/** Stores replayable responses for mutating integration requests. */
export const integrationApiIdempotency = pgTable(
  'integration_api_idempotency',
  {
    key: varchar('key', { length: 200 }).primaryKey(),
    route: varchar('route', { length: 160 }).notNull(),
    requestHash: varchar('request_hash', { length: 64 }).notNull(),
    statusCode: integer('status_code').notNull(),
    responseBody: jsonb('response_body').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('integration_idempotency_expires_idx').on(t.expiresAt)],
);

/** Human approval boundary: providers may only send drafts in approved state. */
export const communicationDrafts = pgTable(
  'communication_drafts',
  {
    id: serial('id').primaryKey(),
    channel: communicationChannelEnum('channel').notNull(),
    status: communicationDraftStatusEnum('status').notNull().default('pending_approval'),
    purpose: varchar('purpose', { length: 80 }).notNull(),
    brandId: integer('brand_id').references(() => crmBrands.id, { onDelete: 'set null' }),
    campaignId: integer('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
    talentId: integer('talent_id').references(() => talents.id, { onDelete: 'set null' }),
    recipient: text('recipient').notNull(),
    subject: text('subject'),
    body: text('body').notNull(),
    model: varchar('model', { length: 100 }),
    automationKey: varchar('automation_key', { length: 200 }),
    sourceActivityId: integer('source_activity_id').references(() => crmActivities.id, { onDelete: 'set null' }),
    riskLevel: automationRiskLevelEnum('risk_level').notNull().default('medium'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    reviewedByUserId: text('reviewed_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    reviewNote: text('review_note'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    rejectedAt: timestamp('rejected_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    providerMessageId: varchar('provider_message_id', { length: 200 }),
    failureCode: varchar('failure_code', { length: 80 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('communication_drafts_status_idx').on(t.status),
    index('communication_drafts_brand_idx').on(t.brandId),
    index('communication_drafts_campaign_idx').on(t.campaignId),
    index('communication_drafts_created_idx').on(t.createdAt),
    uniqueIndex('communication_drafts_automation_key_uniq').on(t.automationKey),
  ],
);

export const automationEventOutboxRelations = relations(automationEventOutbox, ({ many }) => ({
  deliveries: many(automationWebhookDeliveries),
}));

export const automationWebhookDeliveriesRelations = relations(automationWebhookDeliveries, ({ one }) => ({
  event: one(automationEventOutbox, {
    fields: [automationWebhookDeliveries.eventId],
    references: [automationEventOutbox.id],
  }),
}));

export const communicationDraftsRelations = relations(communicationDrafts, ({ one }) => ({
  brand: one(crmBrands, { fields: [communicationDrafts.brandId], references: [crmBrands.id] }),
  campaign: one(campaigns, { fields: [communicationDrafts.campaignId], references: [campaigns.id] }),
  talent: one(talents, { fields: [communicationDrafts.talentId], references: [talents.id] }),
  sourceActivity: one(crmActivities, {
    fields: [communicationDrafts.sourceActivityId],
    references: [crmActivities.id],
  }),
  reviewedBy: one(user, {
    fields: [communicationDrafts.reviewedByUserId],
    references: [user.id],
  }),
}));
