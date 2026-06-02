import { pgTable, serial, integer, varchar, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { posts } from './posts';

export const postEvents = pgTable('post_events', {
  id:           serial('id').primaryKey(),
  postId:       integer('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  // 'view' en v1 — arquitectura preparada para 'reaction_like' | 'reaction_fire' | 'reaction_love' en v2
  action:       varchar('action', { length: 20 }).notNull().default('view'),
  sessionHash:  varchar('session_hash', { length: 64 }).notNull(),
  country:      varchar('country', { length: 2 }),
  referrerHost: varchar('referrer_host', { length: 255 }),
  device:       varchar('device', { length: 20 }),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('post_events_post_id_created_at_idx').on(t.postId, t.createdAt),
  index('post_events_created_at_idx').on(t.createdAt),
  // sessionHash rota diariamente (incluye fecha en su cálculo) → dedup efectivo por usuario/día/artículo
  uniqueIndex('post_events_dedup_idx').on(t.sessionHash, t.postId, t.action),
]);
