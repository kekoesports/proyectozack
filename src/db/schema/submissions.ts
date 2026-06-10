import { pgTable, serial, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';

export const contactSubmissions = pgTable('contact_submissions', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 200 }).notNull(),
  phone: varchar('phone', { length: 30 }),
  type: varchar('type', { length: 50 }).notNull(),
  company: varchar('company', { length: 100 }),
  message: text('message').notNull(),
  // Brand-specific fields
  budget: varchar('budget', { length: 20 }),
  timeline: varchar('timeline', { length: 30 }),
  audience: varchar('audience', { length: 200 }),
  vertical: varchar('vertical', { length: 30 }),
  // Creator-specific fields
  platform: varchar('platform', { length: 30 }),
  viewers: varchar('viewers', { length: 100 }),
  monetization: varchar('monetization', { length: 200 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  ipHash: varchar('ip_hash', { length: 64 }),
}, (t) => [
  index('contact_submissions_created_at_idx').on(t.createdAt),
  index('contact_submissions_ip_hash_idx').on(t.ipHash),
]);
