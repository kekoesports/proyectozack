import { pgEnum, pgTable, serial, varchar, text, boolean, timestamp, index, unique } from 'drizzle-orm/pg-core';

export const newsletterStatusEnum = pgEnum('newsletter_status', ['active', 'unsubscribed']);

export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id:               serial('id').primaryKey(),
  email:            varchar('email', { length: 254 }).notNull(),
  status:           newsletterStatusEnum('status').notNull().default('active'),
  source:           varchar('source', { length: 50 }).notNull().default('news_popup'),

  consentNewsletter: boolean('consent_newsletter').notNull(),
  consentMarketing:  boolean('consent_marketing').notNull().default(false),
  consentVersion:    varchar('consent_version', { length: 30 }).notNull(),
  consentText:       text('consent_text').notNull(),

  ipHash:            varchar('ip_hash', { length: 64 }),
  userAgent:         text('user_agent'),

  // Token para baja en futuros emails — generado en suscripción
  unsubscribeToken:  varchar('unsubscribe_token', { length: 64 }).unique(),

  subscribedAt:     timestamp('subscribed_at', { withTimezone: true }).notNull().defaultNow(),
  unsubscribedAt:   timestamp('unsubscribed_at', { withTimezone: true }),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('newsletter_subscribers_email_uniq').on(t.email),
  index('newsletter_subscribers_status_idx').on(t.status),
  index('newsletter_subscribers_subscribed_idx').on(t.subscribedAt),
]);

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
