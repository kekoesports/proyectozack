import { pgTable, serial, varchar, boolean, timestamp, date } from 'drizzle-orm/pg-core';

export const matches = pgTable('matches', {
  id:           serial('id').primaryKey(),
  team1:        varchar('team1', { length: 100 }).notNull(),
  team2:        varchar('team2', { length: 100 }).notNull(),
  team1Logo:    varchar('team1_logo', { length: 500 }),
  team2Logo:    varchar('team2_logo', { length: 500 }),
  tournament:   varchar('tournament', { length: 200 }),
  matchDate:    date('match_date'),
  matchTime:    varchar('match_time', { length: 5 }),   // HH:MM
  matchStatus:  varchar('match_status', { length: 20 }).default('upcoming'), // upcoming | live | finished
  isFeatured:   boolean('is_featured').notNull().default(false),
  isActive:     boolean('is_active').notNull().default(true),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
