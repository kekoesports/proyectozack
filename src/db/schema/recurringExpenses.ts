import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  date,
  timestamp,
  numeric,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import {
  invoiceScopeEnum,
  invoiceCompanyEnum,
  invoicePaymentMethodEnum,
  expenseGroupEnum,
  expenseSubtypeEnum,
} from './invoices';

/**
 * Plantillas de gastos recurrentes. El cron mensual genera automáticamente
 * una invoice por cada plantilla activa, usando txId='recurring:{id}:{YYYY-MM}'
 * como clave de idempotencia.
 */
export const recurringExpenses = pgTable(
  'recurring_expenses',
  {
    id: serial('id').primaryKey(),

    name: varchar('name', { length: 200 }).notNull(),
    concept: text('concept').notNull(),

    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),

    vatPct: numeric('vat_pct', { precision: 5, scale: 2 }).notNull().default('0.00'),
    withholdingPct: numeric('withholding_pct', { precision: 5, scale: 2 }).notNull().default('0.00'),

    category: varchar('category', { length: 80 }),
    counterpartyName: varchar('counterparty_name', { length: 200 }),

    // Financial classification — mirrors invoices columns. Nullable for compat.
    expenseGroup:   expenseGroupEnum('expense_group'),
    expenseSubtype: expenseSubtypeEnum('expense_subtype'),

    scope: invoiceScopeEnum('scope').notNull().default('company'),
    company: invoiceCompanyEnum('company'),
    paymentMethod: invoicePaymentMethodEnum('payment_method'),

    dayOfMonth: integer('day_of_month').notNull().default(1),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),

    active: boolean('active').notNull().default(true),
    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('recurring_expenses_active_idx').on(t.active),
    index('recurring_expenses_start_date_idx').on(t.startDate),
  ],
);
