import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { campaigns } from './campaigns';
import { talents } from './talents';
import { user } from './auth';

/**
 * deliverable_status: lifecycle of a campaign deliverable from creation to brand approval.
 *
 * pending_submission  → waiting for talent to submit the content
 * submitted           → talent submitted, pending internal agency review
 * internal_review     → agency reviewing before sending to brand
 * brand_review        → sent to brand for approval
 * approved            → brand approved — unlocks invoice line item
 * revision_requested  → brand or agency requested changes
 * rejected            → permanently rejected
 */
export const deliverableStatusEnum = pgEnum('deliverable_status', [
  'pending_submission',
  'submitted',
  'internal_review',
  'brand_review',
  'approved',
  'revision_requested',
  'rejected',
]);

/**
 * deliverable_type: the kind of content being delivered.
 */
export const deliverableTypeEnum = pgEnum('deliverable_type', [
  'stream_integration',
  'video_youtube',
  'short_reel_tiktok',
  'story_instagram',
  'tweet_x',
  'post_instagram',
  'pack_mensual',
  'pack_trimestral',
  'otro',
]);

export const deliverables = pgTable(
  'deliverables',
  {
    id: serial('id').primaryKey(),

    campaignId: integer('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
    talentId: integer('talent_id').notNull().references(() => talents.id, { onDelete: 'restrict' }),

    title: varchar('title', { length: 200 }).notNull(),
    type: deliverableTypeEnum('type').notNull(),
    description: text('description'),

    status: deliverableStatusEnum('status').notNull().default('pending_submission'),

    // The actual content URL once submitted (Twitch VOD, YouTube link, etc.)
    contentUrl: text('content_url'),

    // Submission tracking
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    submittedByUserId: text('submitted_by_user_id').references(() => user.id, { onDelete: 'set null' }),

    // Approval tracking
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedByUserId: text('reviewed_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),

    // Revision notes (latest revision request message)
    revisionNotes: text('revision_notes'),

    // Due date for delivery
    dueDate: timestamp('due_date', { withTimezone: true }),

    // Optional invoice reference — set when deliverable is approved and invoice generated
    invoiceId: integer('invoice_id'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('deliverables_campaign_idx').on(t.campaignId),
    index('deliverables_talent_idx').on(t.talentId),
    index('deliverables_status_idx').on(t.status),
    index('deliverables_due_date_idx').on(t.dueDate),
  ],
);

/**
 * deliverable_comments: audit trail of review messages per deliverable.
 * Each status transition can have an associated comment.
 */
export const deliverableComments = pgTable(
  'deliverable_comments',
  {
    id: serial('id').primaryKey(),
    deliverableId: integer('deliverable_id').notNull().references(() => deliverables.id, { onDelete: 'cascade' }),
    authorUserId: text('author_user_id').references(() => user.id, { onDelete: 'set null' }),
    content: text('content').notNull(),
    // Status at the time of this comment (for audit trail)
    statusSnapshot: deliverableStatusEnum('status_snapshot').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('deliverable_comments_deliverable_idx').on(t.deliverableId),
  ],
);

export const deliverablesRelations = relations(deliverables, ({ one, many }) => ({
  campaign: one(campaigns, { fields: [deliverables.campaignId], references: [campaigns.id] }),
  talent: one(talents, { fields: [deliverables.talentId], references: [talents.id] }),
  submittedBy: one(user, {
    fields: [deliverables.submittedByUserId],
    references: [user.id],
    relationName: 'deliverableSubmitter',
  }),
  reviewedBy: one(user, {
    fields: [deliverables.reviewedByUserId],
    references: [user.id],
    relationName: 'deliverableReviewer',
  }),
  comments: many(deliverableComments),
}));

export const deliverableCommentsRelations = relations(deliverableComments, ({ one }) => ({
  deliverable: one(deliverables, {
    fields: [deliverableComments.deliverableId],
    references: [deliverables.id],
  }),
  author: one(user, {
    fields: [deliverableComments.authorUserId],
    references: [user.id],
    relationName: 'deliverableCommentAuthor',
  }),
}));
