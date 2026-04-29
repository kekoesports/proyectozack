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
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';
import { crmBrands } from './crmBrands';
import { talents } from './talents';
import { campaigns } from './campaigns';

// ── Empresas emisoras ─────────────────────────────────────────────────

export const issuerCompanies = pgTable(
  'issuer_companies',
  {
    id:                    serial('id').primaryKey(),
    name:                  varchar('name',                  { length: 200 }).notNull(),
    legalName:             varchar('legal_name',            { length: 250 }),
    taxId:                 varchar('tax_id',                { length: 30  }),
    country:               varchar('country',               { length: 50  }),
    address:               text('address'),
    city:                  varchar('city',                  { length: 100 }),
    postalCode:            varchar('postal_code',           { length: 20  }),
    email:                 varchar('email',                 { length: 180 }),
    logoUrl:               text('logo_url'),
    defaultCurrency:       varchar('default_currency',      { length: 3   }).notNull().default('EUR'),
    defaultPaymentTerms:   text('default_payment_terms'),
    bankDetails:           text('bank_details'),
    cryptoDetails:         text('crypto_details'),
    invoiceSeriesPrefix:   varchar('invoice_series_prefix', { length: 10  }).notNull().default('SP'),
    nextInvoiceNumber:     integer('next_invoice_number').notNull().default(1),
    notes:                 text('notes'),
    isActive:              boolean('is_active').notNull().default(true),
    createdAt:             timestamp('created_at',  { withTimezone: true }).notNull().defaultNow(),
    updatedAt:             timestamp('updated_at',  { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('issuer_companies_active_idx').on(t.isActive)],
);

// ── Clientes de facturación ───────────────────────────────────────────

export const billingClients = pgTable(
  'billing_clients',
  {
    id:                    serial('id').primaryKey(),
    name:                  varchar('name',                  { length: 200 }).notNull(),
    legalName:             varchar('legal_name',            { length: 250 }),
    taxId:                 varchar('tax_id',                { length: 30  }),
    vatNumber:             varchar('vat_number',            { length: 30  }),
    country:               varchar('country',               { length: 50  }),
    address:               text('address'),
    city:                  varchar('city',                  { length: 100 }),
    postalCode:            varchar('postal_code',           { length: 20  }),
    email:                 varchar('email',                 { length: 180 }),
    type:                  varchar('type',                  { length: 50  }).notNull().default('empresa_espana'),
    defaultVatRate:        numeric('default_vat_rate',        { precision: 5, scale: 2 }).notNull().default('0'),
    defaultWithholdingRate: numeric('default_withholding_rate', { precision: 5, scale: 2 }).notNull().default('0'),
    relatedBrandId:        integer('related_brand_id').references(() => crmBrands.id, { onDelete: 'set null' }),
    notes:                 text('notes'),
    createdAt:             timestamp('created_at',  { withTimezone: true }).notNull().defaultNow(),
    updatedAt:             timestamp('updated_at',  { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('billing_clients_brand_idx').on(t.relatedBrandId),
    index('billing_clients_type_idx').on(t.type),
  ],
);

// ── Facturas emitidas ─────────────────────────────────────────────────

export const issuedInvoices = pgTable(
  'issued_invoices',
  {
    id:                    serial('id').primaryKey(),
    issuerCompanyId:       integer('issuer_company_id').notNull().references(() => issuerCompanies.id),
    billingClientId:       integer('billing_client_id').notNull().references(() => billingClients.id),
    relatedBrandId:        integer('related_brand_id').references(() => crmBrands.id, { onDelete: 'set null' }),
    relatedTalentId:       integer('related_talent_id').references(() => talents.id, { onDelete: 'set null' }),
    relatedDealId:         integer('related_deal_id').references(() => campaigns.id, { onDelete: 'set null' }),

    invoiceNumber:         varchar('invoice_number', { length: 60 }).notNull(),
    series:                varchar('series',         { length: 20 }),
    status:                varchar('status',         { length: 30 }).notNull().default('borrador'),

    issueDate:             date('issue_date').notNull(),
    dueDate:               date('due_date'),
    currency:              varchar('currency', { length: 3 }).notNull().default('EUR'),

    netAmount:             numeric('net_amount',         { precision: 12, scale: 2 }).notNull().default('0'),
    vatRate:               numeric('vat_rate',           { precision: 5,  scale: 2 }).notNull().default('0'),
    vatAmount:             numeric('vat_amount',         { precision: 12, scale: 2 }).notNull().default('0'),
    withholdingRate:       numeric('withholding_rate',   { precision: 5,  scale: 2 }).notNull().default('0'),
    withholdingAmount:     numeric('withholding_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    totalAmount:           numeric('total_amount',       { precision: 12, scale: 2 }).notNull().default('0'),

    paymentTerms:          text('payment_terms'),
    legalNote:             text('legal_note'),
    notes:                 text('notes'),
    pdfUrl:                text('pdf_url'),

    createdByUserId:       text('created_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt:             timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:             timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('issued_invoices_issuer_idx').on(t.issuerCompanyId),
    index('issued_invoices_client_idx').on(t.billingClientId),
    index('issued_invoices_status_idx').on(t.status),
    index('issued_invoices_date_idx').on(t.issueDate),
    index('issued_invoices_brand_idx').on(t.relatedBrandId),
    index('issued_invoices_num_idx').on(t.issuerCompanyId, t.invoiceNumber),
  ],
);

// ── Líneas de factura ─────────────────────────────────────────────────

export const issuedInvoiceLines = pgTable(
  'issued_invoice_lines',
  {
    id:          serial('id').primaryKey(),
    invoiceId:   integer('invoice_id').notNull().references(() => issuedInvoices.id, { onDelete: 'cascade' }),
    concept:     varchar('concept',     { length: 500 }).notNull(),
    description: text('description'),
    quantity:    numeric('quantity',   { precision: 10, scale: 2 }).notNull().default('1'),
    unitPrice:   numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    discount:    numeric('discount',   { precision: 5,  scale: 2 }).notNull().default('0'),
    subtotal:    numeric('subtotal',   { precision: 12, scale: 2 }).notNull(),
    createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('invoice_lines_invoice_idx').on(t.invoiceId)],
);

// ── Relaciones ────────────────────────────────────────────────────────

export const issuedInvoicesRelations = relations(issuedInvoices, ({ one, many }) => ({
  issuer:    one(issuerCompanies, { fields: [issuedInvoices.issuerCompanyId], references: [issuerCompanies.id] }),
  client:    one(billingClients,  { fields: [issuedInvoices.billingClientId],  references: [billingClients.id]  }),
  brand:     one(crmBrands,       { fields: [issuedInvoices.relatedBrandId],   references: [crmBrands.id]       }),
  talent:    one(talents,         { fields: [issuedInvoices.relatedTalentId],  references: [talents.id]         }),
  deal:      one(campaigns,       { fields: [issuedInvoices.relatedDealId],    references: [campaigns.id]       }),
  createdBy: one(user,            { fields: [issuedInvoices.createdByUserId],  references: [user.id]            }),
  lines:     many(issuedInvoiceLines),
}));

export const issuedInvoiceLinesRelations = relations(issuedInvoiceLines, ({ one }) => ({
  invoice: one(issuedInvoices, { fields: [issuedInvoiceLines.invoiceId], references: [issuedInvoices.id] }),
}));

export const billingClientsRelations = relations(billingClients, ({ one }) => ({
  brand: one(crmBrands, { fields: [billingClients.relatedBrandId], references: [crmBrands.id] }),
}));
