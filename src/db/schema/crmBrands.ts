import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  boolean,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
// Note: crmBrandStatusEnum uses pgEnum; followup priority uses varchar(10)
import { relations } from 'drizzle-orm';
import { user } from './auth';

export const crmBrandStatusEnum = pgEnum('crm_brand_status', [
  'lead',
  'contactado',
  'en_negociacion',
  'propuesta_enviada',
  'activa',
  'inactiva',
  'perdida',
  'pausada',
  'archivada',
]);

// priority stored as varchar(10) in DB (alta|media|baja)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _crmFollowupPriorityValues = ['alta', 'media', 'baja'] as const;

export const crmBrands = pgTable(
  'crm_brands',
  {
    id: serial('id').primaryKey(),

    name: varchar('name', { length: 200 }).notNull(),
    legalName: varchar('legal_name', { length: 250 }),
    website: text('website'),
    tipo: varchar('tipo', { length: 20 }),
    sector: varchar('sector', { length: 80 }),
    geo: varchar('geo', { length: 80 }),
    country: varchar('country', { length: 50 }),

    status: crmBrandStatusEnum('status').notNull().default('lead'),
    ownerUserId: text('owner_user_id').references(() => user.id, { onDelete: 'set null' }),
    portalUserId: text('portal_user_id').references(() => user.id, { onDelete: 'set null' }),

    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('crm_brands_status_idx').on(t.status),
    index('crm_brands_owner_idx').on(t.ownerUserId),
    index('crm_brands_portal_user_idx').on(t.portalUserId),
    index('crm_brands_name_idx').on(t.name),
  ],
);

export const crmBrandContacts = pgTable(
  'crm_brand_contacts',
  {
    id: serial('id').primaryKey(),
    brandId: integer('brand_id').notNull().references(() => crmBrands.id, { onDelete: 'cascade' }),

    name: varchar('name', { length: 150 }).notNull(),
    role: varchar('role', { length: 100 }),
    email: varchar('email', { length: 180 }),
    phone: varchar('phone', { length: 40 }),
    telegram: varchar('telegram', { length: 80 }),
    discord: varchar('discord', { length: 80 }),
    whatsapp: varchar('whatsapp', { length: 40 }),
    notes: text('notes'),
    isPrimary: boolean('is_primary').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('crm_brand_contacts_brand_idx').on(t.brandId),
    index('crm_brand_contacts_email_idx').on(t.email),
  ],
);

export const crmBrandFollowups = pgTable(
  'crm_brand_followups',
  {
    id: serial('id').primaryKey(),
    brandId: integer('brand_id').notNull().references(() => crmBrands.id, { onDelete: 'cascade' }),
    createdByUserId: text('created_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    note: text('note').notNull(),
    priority: varchar('priority', { length: 10 }).notNull().default('media'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('crm_brand_followups_brand_idx').on(t.brandId),
    index('crm_brand_followups_scheduled_idx').on(t.scheduledAt),
    index('crm_brand_followups_completed_idx').on(t.completedAt),
    index('crm_brand_followups_priority_idx').on(t.priority),
  ],
);

export const crmBrandsRelations = relations(crmBrands, ({ one, many }) => ({
  owner: one(user, { fields: [crmBrands.ownerUserId], references: [user.id], relationName: 'crmBrandOwner' }),
  portalUser: one(user, { fields: [crmBrands.portalUserId], references: [user.id], relationName: 'crmBrandPortalUser' }),
  contacts: many(crmBrandContacts),
  followups: many(crmBrandFollowups),
}));

export const crmBrandContactsRelations = relations(crmBrandContacts, ({ one }) => ({
  brand: one(crmBrands, { fields: [crmBrandContacts.brandId], references: [crmBrands.id] }),
}));

export const crmBrandFollowupsRelations = relations(crmBrandFollowups, ({ one }) => ({
  brand: one(crmBrands, { fields: [crmBrandFollowups.brandId], references: [crmBrands.id] }),
  createdBy: one(user, { fields: [crmBrandFollowups.createdByUserId], references: [user.id] }),
}));
