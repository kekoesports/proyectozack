import { pgTable, serial, varchar, integer, index } from 'drizzle-orm/pg-core';

export const rankingEntries = pgTable('ranking_entries', {
  id: serial('id').primaryKey(),
  position: integer('position').notNull(),
  teamName: varchar('team_name', { length: 100 }).notNull(),
  teamLogo: varchar('team_logo', { length: 500 }),
  country: varchar('country', { length: 3 }),
  points: integer('points').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
}, (t) => [
  index('ranking_entries_position_idx').on(t.position),
]);
