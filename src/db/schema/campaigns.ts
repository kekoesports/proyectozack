import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  date,
  boolean,
  numeric,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';
import { crmBrands } from './crmBrands';
import { talents } from './talents';

export const campaignStatusEnum = pgEnum('campaign_status', [
  'negociacion',
  'activa',
  'pausada',
  'finalizada',
  'cancelada',
]);

// Esta tabla existía previamente con columnas adicionales.
// Se mapean las columnas reales de la BD.
export const campaigns = pgTable(
  'campaigns',
  {
    id: serial('id').primaryKey(),

    brandId: integer('brand_id').references(() => crmBrands.id, { onDelete: 'set null' }),
    talentId: integer('talent_id').references(() => talents.id, { onDelete: 'set null' }),

    name: varchar('name', { length: 200 }).notNull(),
    sector: varchar('sector', { length: 80 }),
    geo: varchar('geo', { length: 80 }),
    actionType: varchar('action_type', { length: 100 }),

    status: campaignStatusEnum('status').notNull().default('negociacion'),
    startDate: date('start_date'),
    endDate: date('end_date'),
    deliveryDeadline: date('delivery_deadline'),

    description: text('description'),
    deliverables: text('deliverables'),
    briefingUrl: text('briefing_url'),
    contentUrl: text('content_url'),
    notes: text('notes'),

    // Importes (columnas preexistentes)
    amountBrand: numeric('amount_brand', { precision: 12, scale: 2 }),
    amountTalent: numeric('amount_talent', { precision: 12, scale: 2 }),

    // Importes nuevos
    agencyFee: numeric('agency_fee', { precision: 12, scale: 2 }),
    agencyFeePercent: numeric('agency_fee_percent', { precision: 5, scale: 2 }),

    // Pagos marca → agencia
    brandPaid: boolean('brand_paid').notNull().default(false),
    brandPaidDate: date('brand_paid_date'),
    brandPaidAmount: numeric('brand_paid_amount', { precision: 12, scale: 2 }),
    brandPaymentMethod: varchar('brand_payment_method', { length: 80 }),

    // Pagos agencia → influencer
    talentPaid: boolean('talent_paid').notNull().default(false),
    talentPaidDate: date('talent_paid_date'),
    talentPaidAmount: numeric('talent_paid_amount', { precision: 12, scale: 2 }),
    talentPaymentMethod: varchar('talent_payment_method', { length: 80 }),

    // Responsables (columnas preexistentes)
    responsibleUserId: text('responsible_user_id').references(() => user.id, { onDelete: 'set null' }),
    createdByUserId: text('created_by_user_id').references(() => user.id, { onDelete: 'set null' }),

    visibility: varchar('visibility', { length: 20 }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('campaigns_brand_idx').on(t.brandId),
    index('campaigns_talent_idx').on(t.talentId),
    index('campaigns_status_idx').on(t.status),
    index('campaigns_responsible_idx').on(t.responsibleUserId),
    index('campaigns_start_date_idx').on(t.startDate),
  ],
);

export const campaignsRelations = relations(campaigns, ({ one }) => ({
  brand: one(crmBrands, { fields: [campaigns.brandId], references: [crmBrands.id] }),
  talent: one(talents, { fields: [campaigns.talentId], references: [talents.id] }),
  responsible: one(user, { fields: [campaigns.responsibleUserId], references: [user.id], relationName: 'campaignResponsible' }),
  createdBy: one(user, { fields: [campaigns.createdByUserId], references: [user.id], relationName: 'campaignCreatedBy' }),
}));
