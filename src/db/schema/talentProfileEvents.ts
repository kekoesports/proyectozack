import { pgTable, serial, integer, varchar, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { talents } from './talents';

export const talentProfileEvents = pgTable('talent_profile_events', {
  id:           serial('id').primaryKey(),
  talentId:     integer('talent_id').notNull().references(() => talents.id, { onDelete: 'cascade' }),
  // 'view' en v1 — preparado para 'click_code' | 'click_contact' en v2
  action:       varchar('action', { length: 20 }).notNull().default('view'),
  sessionHash:  varchar('session_hash', { length: 64 }).notNull(),
  country:      varchar('country', { length: 2 }),
  referrerHost: varchar('referrer_host', { length: 255 }),
  device:       varchar('device', { length: 20 }),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('talent_profile_events_talent_id_created_at_idx').on(t.talentId, t.createdAt),
  index('talent_profile_events_created_at_idx').on(t.createdAt),
  // sessionHash rota diariamente → dedup efectivo por usuario/día/perfil
  uniqueIndex('talent_profile_events_dedup_idx').on(t.sessionHash, t.talentId, t.action),
]);
