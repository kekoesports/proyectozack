import {
  pgEnum,
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

import { user } from './auth';

export const fileTypeEnum = pgEnum('file_type', [
  'invoice',
  'statement',
  'contract',
  'briefing',
  'geo_stats',
  'screenshot',
  'receipt',
  'other',
]);

export const fileRelatedTypeEnum = pgEnum('file_related_type', [
  'brand',
  'talent',
  'campaign', // intentional — campaigns table arrives in Fase 3
  'invoice',
  'followup',
  'task',
]);

export const files = pgTable(
  'files',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 250 }).notNull(),
    type: fileTypeEnum('type').notNull().default('other'),
    mime: varchar('mime', { length: 120 }),
    sizeBytes: integer('size_bytes'),
    url: text('url').notNull(),
    path: text('path'),
    relatedType: fileRelatedTypeEnum('related_type').notNull(),
    relatedId: integer('related_id').notNull(),
    platform: varchar('platform', { length: 30 }), // para geo_stats: twitch/youtube/instagram/tiktok/kick
    notes: text('notes'),
    uploadedByUserId: text('uploaded_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('files_related_idx').on(t.relatedType, t.relatedId),
    index('files_type_idx').on(t.type),
    index('files_uploaded_by_idx').on(t.uploadedByUserId),
  ],
);
