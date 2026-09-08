import { pgTable, serial, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';

export const creatorApplications = pgTable('creator_applications', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 200 }).notNull(),
  country: varchar('country', { length: 100 }),
  platform: varchar('platform', { length: 50 }).notNull(),
  handle: varchar('handle', { length: 500 }).notNull(),
  contentCategory: varchar('content_category', { length: 100 }),
  followers: varchar('followers', { length: 50 }),
  averageAudience: varchar('average_audience', { length: 100 }),
  otherLinks: text('other_links'),
  message: text('message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('creator_applications_created_at_idx').on(t.createdAt),
]);
