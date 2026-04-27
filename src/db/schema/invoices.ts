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
import { files } from './files';

export const invoiceKindEnum = pgEnum('invoice_kind', ['income', 'expense']);
export const invoiceStatusEnum = pgEnum('invoice_status', [
  'borrador',
  'emitida',
  'cobrada',
  'vencida',
  'anulada',
  'pagada',
  'parcial',
  'no_cobrada',
  'no_pagada',
]);

export const invoiceCompanyEnum = pgEnum('invoice_company', [
  'spain',
  'andorra',
  'argentina',
  'spain_andorra',
  'spain_argentina',
]);

export const invoicePaymentMethodEnum = pgEnum('invoice_payment_method', [
  'banco',
  'crypto',
  'banco_agencia',
  'banco_stark',
  'crypto_agencia',
  'crypto_zack',
  'otro',
]);

export const invoiceAiToolEnum = pgEnum('invoice_ai_tool', [
  'chatgpt',
  'claude',
  'gemini',
  'midjourney',
  'otro',
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
    paidAmount: numeric('paid_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),

    series: varchar('series', { length: 20 }).notNull().default('A'),
    status: invoiceStatusEnum('status').notNull().default('borrador'),

    company: invoiceCompanyEnum('company'),
    paymentMethod: invoicePaymentMethodEnum('payment_method'),
    aiTool: invoiceAiToolEnum('ai_tool'),

    // Legacy attachment fields — kept for compat. Source of truth is files via invoiceFileId.
    fileUrl: text('file_url'),
    filePath: text('file_path'),

    invoiceFileId: integer('invoice_file_id').references(() => files.id, { onDelete: 'set null' }),
    statementFileId: integer('statement_file_id').references(() => files.id, { onDelete: 'set null' }),

    notes: text('notes'),

    createdByUserId: text('created_by_user_id').references(() => user.id, { onDelete: 'set null' }),

    // FK to campaigns — no .references() here to avoid potential circular imports; FK enforced in migration SQL
    campaignId: integer('campaign_id'),

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
    index('invoices_company_idx').on(t.company),
    index('invoices_payment_method_idx').on(t.paymentMethod),
    index('invoices_invoice_file_idx').on(t.invoiceFileId),
    index('invoices_statement_file_idx').on(t.statementFileId),
  ],
);

export const invoicesRelations = relations(invoices, ({ one }) => ({
  brand: one(crmBrands, { fields: [invoices.brandId], references: [crmBrands.id] }),
  talent: one(talents, { fields: [invoices.talentId], references: [talents.id] }),
  createdBy: one(user, { fields: [invoices.createdByUserId], references: [user.id] }),
  invoiceFile: one(files, { fields: [invoices.invoiceFileId], references: [files.id], relationName: 'invoiceFile' }),
  statementFile: one(files, { fields: [invoices.statementFileId], references: [files.id], relationName: 'statementFile' }),
}));
