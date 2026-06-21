import type { InferSelectModel } from 'drizzle-orm';
import type { invoicePayments } from '@/db/schema';

export type InvoicePayment = InferSelectModel<typeof invoicePayments>;
export type NewInvoicePayment = Omit<InvoicePayment, 'id' | 'createdAt'>;
