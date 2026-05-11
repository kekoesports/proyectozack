import { pgTable, serial, varchar, integer, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { posts } from './posts';

export type EditorialSlotKey =
  | 'hero'
  | 'secondary_1'
  | 'secondary_2'
  | 'featured_interview'
  | 'featured_clip'
  | 'featured_match';

export const editorialSlots = pgTable('editorial_slots', {
  id: serial('id').primaryKey(),
  slot: varchar('slot', { length: 50 }).notNull().unique(),
  postId: integer('post_id').references(() => posts.id, { onDelete: 'set null' }),
  meta: jsonb('meta'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index('editorial_slots_slot_idx').on(t.slot),
]);
