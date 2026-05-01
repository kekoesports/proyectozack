import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { invoices } from '@/db/schema';
import type { FileRecord } from '@/types';

export type Invoice = InferSelectModel<typeof invoices>;
export type NewInvoice = InferInsertModel<typeof invoices>;

export type InvoiceKind = Invoice['kind'];
export type InvoiceStatus = Invoice['status'];
export type InvoiceCompany = NonNullable<Invoice['company']>;
export type InvoicePaymentMethod = NonNullable<Invoice['paymentMethod']>;
export type InvoiceAiTool = NonNullable<Invoice['aiTool']>;

export type InvoiceWithRelations = Invoice & {
  readonly brandName: string | null;
  readonly talentName: string | null;
  readonly campaignName: string | null;
  readonly entity?: string | null;
  readonly invoiceFile?: FileRecord | null;
  readonly statementFile?: FileRecord | null;
};

export type BillingKPIs = {
  readonly incomeTotal: number;
  readonly expenseTotal: number;
  readonly netTotal: number;
  readonly pendingCobro: number;
  readonly pendingPago: number;
  readonly ingresosBanco: number;
  readonly ingresosCrypto: number;
  readonly gastoEmpresa: number;
  readonly gastoCreador: number;
};

/** @deprecated Use BillingKPIs */
export type InvoiceSummary = {
  readonly incomeTotal: number;
  readonly expenseTotal: number;
  readonly netTotal: number;
  readonly pendingIncome: number;
  readonly overdueIncome: number;
};
