import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  date,
  timestamp,
  numeric,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';
import { crmBrands } from './crmBrands';
import { talents } from './talents';

export const invoiceKindEnum = pgEnum('invoice_kind', ['income', 'expense']);
export const invoiceStatusEnum = pgEnum('invoice_status', [
  'borrador',
  'emitida',
  'cobrada',
  'vencida',
  'anulada',
]);

export const invoices = pgTable(
  'invoices',
  {
    id: serial('id').primaryKey(),

    kind: invoiceKindEnum('kind').notNull(),
    number: varchar('number', { length: 60 }),

    issueDate: date('issue_date').notNull(),
    dueDate: date('due_date'),
    paidDate: date('paid_date'),

    brandId: integer('brand_id').references(() => crmBrands.id, { onDelete: 'set null' }),
    talentId: integer('talent_id').references(() => talents.id, { onDelete: 'set null' }),
    counterpartyName: varchar('counterparty_name', { length: 200 }),

    concept: text('concept').notNull(),
    category: varchar('category', { length: 80 }),

    netAmount: numeric('net_amount', { precision: 12, scale: 2 }).notNull(),
    vatPct: numeric('vat_pct', { precision: 5, scale: 2 }).notNull().default('21.00'),
    withholdingPct: numeric('withholding_pct', { precision: 5, scale: 2 }).notNull().default('0.00'),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),

    series: varchar('series', { length: 20 }).notNull().default('A'),
    status: invoiceStatusEnum('status').notNull().default('borrador'),

    fileUrl: text('file_url'),
    filePath: text('file_path'),

    // Entidad contable y método de cobro/pago
    entity: varchar('entity', { length: 80 }),
    paymentMethod: varchar('payment_method', { length: 80 }),

    notes: text('notes'),

    createdByUserId: text('created_by_user_id').references(() => user.id, { onDelete: 'set null' }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('invoices_kind_idx').on(t.kind),
    index('invoices_status_idx').on(t.status),
    index('invoices_brand_idx').on(t.brandId),
    index('invoices_talent_idx').on(t.talentId),
    index('invoices_issue_date_idx').on(t.issueDate),
    index('invoices_due_date_idx').on(t.dueDate),
    index('invoices_category_idx').on(t.category),
    index('invoices_series_idx').on(t.series),
  ],
);

export const invoicesRelations = relations(invoices, ({ one }) => ({
  brand: one(crmBrands, { fields: [invoices.brandId], references: [crmBrands.id] }),
  talent: one(talents, { fields: [invoices.talentId], references: [talents.id] }),
  createdBy: one(user, { fields: [invoices.createdByUserId], references: [user.id] }),
}));
