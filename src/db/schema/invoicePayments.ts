import {
  pgTable,
  serial,
  integer,
  varchar,
  numeric,
  date,
  text,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';
import { bankTransactions } from './bankReconciliation';
import { issuedInvoices } from './issuedInvoices';
import { invoices } from './invoices';

// ── Pagos aplicados desde conciliación bancaria ───────────────────────
// Cada fila representa un cobro/pago humano explícito que vincula una
// transacción bancaria aprobada con una factura emitida o interna.

export const invoicePayments = pgTable(
  'invoice_payments',
  {
    id: serial('id').primaryKey(),

    // Transacción bancaria origen (status: matched)
    bankTransactionId: integer('bank_transaction_id')
      .notNull()
      .references(() => bankTransactions.id, { onDelete: 'restrict' }),

    // FK polimórfica: exactamente una de las dos debe estar presente
    issuedInvoiceId: integer('issued_invoice_id')
      .references(() => issuedInvoices.id, { onDelete: 'restrict' }),
    invoiceId: integer('invoice_id')
      .references(() => invoices.id, { onDelete: 'restrict' }),

    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    paymentDate: date('payment_date').notNull(),
    notes: text('notes'),

    appliedByUserId: text('applied_by_user_id')
      .references(() => user.id, { onDelete: 'set null' }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Idempotencia: una tx solo puede pagar una vez la misma factura emitida
    uniqueIndex('invoice_payments_tx_issued_idx').on(t.bankTransactionId, t.issuedInvoiceId),
    // Idempotencia: una tx solo puede pagar una vez la misma factura interna
    uniqueIndex('invoice_payments_tx_invoice_idx').on(t.bankTransactionId, t.invoiceId),
    index('invoice_payments_issued_idx').on(t.issuedInvoiceId),
    index('invoice_payments_invoice_idx').on(t.invoiceId),
  ],
);

export const invoicePaymentsRelations = relations(invoicePayments, ({ one }) => ({
  bankTransaction: one(bankTransactions, {
    fields: [invoicePayments.bankTransactionId],
    references: [bankTransactions.id],
  }),
  issuedInvoice: one(issuedInvoices, {
    fields: [invoicePayments.issuedInvoiceId],
    references: [issuedInvoices.id],
  }),
  invoice: one(invoices, {
    fields: [invoicePayments.invoiceId],
    references: [invoices.id],
  }),
  appliedBy: one(user, {
    fields: [invoicePayments.appliedByUserId],
    references: [user.id],
  }),
}));
