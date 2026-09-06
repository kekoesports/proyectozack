import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  integer,
  text,
  timestamp,
  boolean,
  jsonb,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { talents } from './talents';

export const talentUsers = pgTable(
  'talent_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    talentId: integer('talent_id')
      .notNull()
      .references(() => talents.id, { onDelete: 'restrict' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    active: boolean('active').notNull().default(true),
    invitedBy: text('invited_by').references(() => user.id, {
      onDelete: 'set null',
    }),
    acceptedAt: timestamp('accepted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('talent_users_pilot_user_uq').on(t.userId),
    index('talent_users_talent_idx').on(t.talentId),
  ],
);

export const studioInvitations = pgTable(
  'studio_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    talentId: integer('talent_id')
      .notNull()
      .references(() => talents.id, { onDelete: 'restrict' }),
    email: text('email').notNull(),
    tokenHash: text('token_hash').notNull(),
    invitedBy: text('invited_by')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('studio_invitation_token_uq').on(t.tokenHash)],
);

/** Structured content only; never executable template HTML or provider credentials. */
export const studioProjects = pgTable(
  'studio_projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    talentId: integer('talent_id')
      .notNull()
      .references(() => talents.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    template: text('template').notNull(),
    platform: text('platform').notNull(),
    brief: text('brief').notNull(),
    script: text('script').notNull().default(''),
    cta: text('cta').notNull().default(''),
    status: text('status').notNull().default('draft'),
    revision: integer('revision').notNull().default(0),
    createdBy: text('created_by').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('studio_project_talent_updated_idx').on(t.talentId, t.updatedAt),
    check(
      'studio_project_status_ck',
      sql`${t.status} in ('draft','in_review','changes_requested','approved')`,
    ),
    check('studio_project_revision_ck', sql`${t.revision} >= 0`),
  ],
);

export const studioVersions = pgTable(
  'studio_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => studioProjects.id, { onDelete: 'cascade' }),
    revision: integer('revision').notNull(),
    document: jsonb('document').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('studio_version_project_revision_uq').on(
      t.projectId,
      t.revision,
    ),
  ],
);

export const studioAssets = pgTable(
  'studio_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    talentId: integer('talent_id')
      .notNull()
      .references(() => talents.id, { onDelete: 'restrict' }),
    projectId: uuid('project_id').references(() => studioProjects.id, {
      onDelete: 'restrict',
    }),
    name: text('name').notNull(),
    storageKey: text('storage_key').notNull(),
    contentType: text('content_type').notNull(),
    size: integer('size').notNull(),
    checksum: text('checksum').notNull(),
    rightsConfirmedBy: text('rights_confirmed_by')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('studio_asset_talent_idx').on(t.talentId),
    uniqueIndex('studio_asset_storage_uq').on(t.storageKey),
    check('studio_asset_size_ck', sql`${t.size} > 0 AND ${t.size} <= 20971520`),
  ],
);

export const studioReviews = pgTable(
  'studio_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => studioProjects.id, { onDelete: 'cascade' }),
    revision: integer('revision').notNull(),
    decision: text('decision').notNull(),
    comment: text('comment').notNull(),
    reviewedBy: text('reviewed_by').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('studio_review_project_idx').on(t.projectId)],
);
