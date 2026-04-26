import { pgTable, serial, integer, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { creatorCodes } from './creatorCodes';

export const codeClicks = pgTable('code_clicks', {
  id: serial('id').primaryKey(),
  codeId: integer('code_id').notNull().references(() => creatorCodes.id, { onDelete: 'cascade' }),
  talentId: integer('talent_id').notNull(),
  brandName: varchar('brand_name', { length: 150 }).notNull(),
  action: varchar('action', { length: 20 }).notNull(), // 'copy' | 'cta'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('code_clicks_code_id_idx').on(t.codeId),
  index('code_clicks_talent_id_idx').on(t.talentId),
  index('code_clicks_created_at_idx').on(t.createdAt),
]);
