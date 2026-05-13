import { pgEnum, pgTable, serial, integer, varchar, text, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { posts } from './posts';

export const newsletterSendStatusEnum = pgEnum('newsletter_send_status', ['sending', 'sent', 'failed']);

export const newsletterSends = pgTable('newsletter_sends', {
  id:             serial('id').primaryKey(),
  postId:         integer('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),

  status:         newsletterSendStatusEnum('status').notNull().default('sending'),
  recipientCount: integer('recipient_count'),
  sentBy:         varchar('sent_by', { length: 254 }),
  errorMessage:   text('error_message'),

  startedAt:      timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt:    timestamp('completed_at', { withTimezone: true }),
}, (t) => [
  unique('newsletter_sends_post_id_uniq').on(t.postId),
  index('newsletter_sends_status_idx').on(t.status),
]);

export type NewsletterSend = typeof newsletterSends.$inferSelect;
