import { pgTable, serial, varchar, boolean, integer, timestamp, date, time, index } from 'drizzle-orm/pg-core';

export const agendaItems = pgTable('agenda_items', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  team1: varchar('team1', { length: 100 }),
  team2: varchar('team2', { length: 100 }),
  tournament: varchar('tournament', { length: 200 }),
  matchDate: date('match_date').notNull(),
  matchTime: time('match_time'),
  isLive: boolean('is_live').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('agenda_items_date_idx').on(t.matchDate),
]);
