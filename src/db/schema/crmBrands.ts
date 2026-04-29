import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  boolean,
  date,
  timestamp,
  pgEnum,
  index,
  numeric,
  jsonb,
} from 'drizzle-orm/pg-core';
// crmBrandStatusEnum uses pgEnum; followup priority uses varchar(10)
import { relations } from 'drizzle-orm';
import { user } from './auth';

export const crmBrandStatusEnum = pgEnum('crm_brand_status', [
  'lead',
  'contactada',
  'en_negociacion',
  'activa',
  'inactiva',
  'perdida',
  'pausada',
  'cerrada',
  'no_interesa',
  'archivada',
]);

export const crmFollowupChannelEnum = pgEnum('crm_followup_channel', [
  'email',
  'telegram',
  'discord',
  'whatsapp',
  'reunion',
  'llamada',
  'otro',
]);

export const crmFollowupStatusEnum = pgEnum('crm_followup_status', [
  'pendiente',
  'hecho',
  'vencido',
]);

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

    createdByUserId: text('created_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    assignedToUserId: text('assigned_to_user_id').references(() => user.id, { onDelete: 'set null' }),

    // GEO objetivo multi-select (comma-separated: 'latam,spain')
    geoTargets: text('geo_targets'),

    // Info de negocio
    lookingFor: text('looking_for'),   // comma-separated
    dealTypes:  text('deal_types'),    // comma-separated

    // Info legal
    taxId:   varchar('tax_id',  { length: 30 }),
    address: text('address'),

    // Seguimiento
    lastContactAt:  timestamp('last_contact_at',   { withTimezone: true }),
    nextFollowupAt: timestamp('next_followup_at',  { withTimezone: true }),
    nextFollowUpAt: date('next_follow_up_at'),

    notes: text('notes'),

    // ── Rate cards & workspace defaults (competitive intelligence gap vs Sprout Workspaces) ──
    // Default talent day rates by tier (EUR). JSON: { nano?: number, micro?: number, macro?: number, mega?: number }
    defaultRateCard: jsonb('default_rate_card')
      .$type<{ nano?: number; micro?: number; macro?: number; mega?: number }>(),
    // Agency service fee (%) applied on top of talent cost for this brand
    agencyFeePct: numeric('agency_fee_pct', { precision: 5, scale: 2 }),
    // Standard payment terms in days (e.g. 30, 45, 60)
    paymentTermsDays: integer('payment_terms_days'),
    // Billing contact email (may differ from CRM contacts)
    billingEmail: varchar('billing_email', { length: 180 }),
    // Brand's NIF/CIF for invoicing
    nif: varchar('nif', { length: 30 }),
    // Fiscal/legal name for invoice generation
    fiscalName: varchar('fiscal_name', { length: 250 }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('crm_brands_status_idx').on(t.status),
    index('crm_brands_owner_idx').on(t.ownerUserId),
    index('crm_brands_portal_user_idx').on(t.portalUserId),
    index('crm_brands_name_idx').on(t.name),
    index('crm_brands_created_by_idx').on(t.createdByUserId),
    index('crm_brands_assigned_to_idx').on(t.assignedToUserId),
    index('crm_brands_next_followup_idx').on(t.nextFollowupAt),
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
    linkedin: varchar('linkedin', { length: 200 }),
    country: varchar('country', { length: 2 }),
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

    channel: crmFollowupChannelEnum('channel'),
    summary: text('summary'),
    nextAction: text('next_action'),
    nextActionAt: timestamp('next_action_at', { withTimezone: true }),
    status: crmFollowupStatusEnum('status').notNull().default('pendiente'),
    assignedToUserId: text('assigned_to_user_id').references(() => user.id, { onDelete: 'set null' }),
    responsibleUserId: text('responsible_user_id').references(() => user.id, { onDelete: 'set null' }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('crm_brand_followups_brand_idx').on(t.brandId),
    index('crm_brand_followups_scheduled_idx').on(t.scheduledAt),
    index('crm_brand_followups_completed_idx').on(t.completedAt),
    index('crm_brand_followups_status_idx').on(t.status),
    index('crm_brand_followups_assigned_to_idx').on(t.assignedToUserId),
    index('crm_brand_followups_priority_idx').on(t.priority),
  ],
);

export const crmBrandsRelations = relations(crmBrands, ({ one, many }) => ({
  owner: one(user, { fields: [crmBrands.ownerUserId], references: [user.id], relationName: 'crmBrandOwner' }),
  portalUser: one(user, { fields: [crmBrands.portalUserId], references: [user.id], relationName: 'crmBrandPortalUser' }),
  createdBy: one(user, { fields: [crmBrands.createdByUserId], references: [user.id], relationName: 'crmBrandCreatedBy' }),
  assignedTo: one(user, { fields: [crmBrands.assignedToUserId], references: [user.id], relationName: 'crmBrandAssignedTo' }),
  contacts: many(crmBrandContacts),
  followups: many(crmBrandFollowups),
}));

export const crmBrandContactsRelations = relations(crmBrandContacts, ({ one }) => ({
  brand: one(crmBrands, { fields: [crmBrandContacts.brandId], references: [crmBrands.id] }),
}));

export const crmBrandFollowupsRelations = relations(crmBrandFollowups, ({ one }) => ({
  brand: one(crmBrands, { fields: [crmBrandFollowups.brandId], references: [crmBrands.id] }),
  createdBy: one(user, { fields: [crmBrandFollowups.createdByUserId], references: [user.id], relationName: 'followupCreatedBy' }),
  assignedTo: one(user, { fields: [crmBrandFollowups.assignedToUserId], references: [user.id], relationName: 'followupAssignedTo' }),
  responsible: one(user, { fields: [crmBrandFollowups.responsibleUserId], references: [user.id], relationName: 'followupResponsible' }),
}));
