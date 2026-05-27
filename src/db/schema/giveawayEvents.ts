import { pgTable, serial, integer, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { giveaways } from './giveaways';

export const giveawayEvents = pgTable('giveaway_events', {
  id:          serial('id').primaryKey(),
  giveawayId:  integer('giveaway_id').references(() => giveaways.id, { onDelete: 'cascade' }),
  action:      varchar('action', { length: 20 }).notNull(), // 'view' | 'click'
  page:        varchar('page', { length: 50 }),              // 'sorteos' | 'giveaways' — solo para action='view'
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('giveaway_events_action_created_idx').on(t.action, t.createdAt),
  index('giveaway_events_giveaway_id_idx').on(t.giveawayId),
  index('giveaway_events_created_at_idx').on(t.createdAt),
]);
