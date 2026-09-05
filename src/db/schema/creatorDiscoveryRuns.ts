import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export type CreatorDiscoveryPlatformResult = {
  readonly platform: 'youtube' | 'twitch' | 'kick' | 'instagram';
  /** Optional only for historical JSON rows written before availability tracking. */
  readonly status?: 'success' | 'partial' | 'failed' | 'skipped';
  readonly warnings?: readonly string[];
  readonly usage?: { readonly searchPages: number; readonly candidateChecks: number };
  readonly found: number;
  readonly qualified: number;
  readonly inserted: number;
  readonly updated: number;
  readonly error: string | null;
};

export const creatorDiscoveryRuns = pgTable(
  'creator_discovery_runs',
  {
    id: serial('id').primaryKey(),
    trigger: varchar('trigger', { length: 20 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('running'),
    foundCount: integer('found_count').notNull().default(0),
    qualifiedCount: integer('qualified_count').notNull().default(0),
    insertedCount: integer('inserted_count').notNull().default(0),
    updatedCount: integer('updated_count').notNull().default(0),
    platformResults: jsonb('platform_results')
      .$type<CreatorDiscoveryPlatformResult[]>()
      .notNull()
      .default([]),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('creator_discovery_runs_started_idx').on(t.startedAt),
    index('creator_discovery_runs_status_idx').on(t.status),
  ],
);
