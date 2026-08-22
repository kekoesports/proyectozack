import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  pgEnum,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { talents } from './talents';

export const talentVerticalEnum = pgEnum('talent_vertical', [
  'casino',
  'cs2_cases',
  'cs2_marketplace',
  'cs2_skin_trading',
  'sports_betting',
  'crypto',
  'gaming_brands',
  'fmcg',
  'tech',
  'otros',
]);

export const talentBusiness = pgTable(
  'talent_business',
  {
    talentId: integer('talent_id')
      .primaryKey()
      .references(() => talents.id, { onDelete: 'cascade' }),

    telegram: varchar('telegram', { length: 80 }),
    whatsapp: varchar('whatsapp', { length: 40 }),
    discord: varchar('discord', { length: 80 }),
    contactEmail: varchar('contact_email', { length: 180 }),

    // Carpeta canónica del creador. Se guarda el ID, no el nombre: en Drive
    // existen carpetas duplicadas para varios talentos y resolver por texto
    // puede enviar una hoja al lugar equivocado.
    googleDriveFolderId: varchar('google_drive_folder_id', { length: 255 }),

    managerName: varchar('manager_name', { length: 150 }),
    managerEmail: varchar('manager_email', { length: 180 }),

    rateNotes: text('rate_notes'),
    internalNotes: text('internal_notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
);

export const talentVerticals = pgTable(
  'talent_verticals',
  {
    id: serial('id').primaryKey(),
    talentId: integer('talent_id')
      .notNull()
      .references(() => talents.id, { onDelete: 'cascade' }),
    vertical: talentVerticalEnum('vertical').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('talent_verticals_talent_idx').on(t.talentId),
    index('talent_verticals_vertical_idx').on(t.vertical),
    unique('talent_verticals_unique').on(t.talentId, t.vertical),
  ],
);

export const talentBusinessRelations = relations(talentBusiness, ({ one }) => ({
  talent: one(talents, { fields: [talentBusiness.talentId], references: [talents.id] }),
}));

export const talentVerticalsRelations = relations(talentVerticals, ({ one }) => ({
  talent: one(talents, { fields: [talentVerticals.talentId], references: [talents.id] }),
}));
