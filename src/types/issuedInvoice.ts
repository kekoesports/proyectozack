import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { issuerCompanies, billingClients, issuedInvoices, issuedInvoiceLines } from '@/db/schema';

export type IssuerCompany       = InferSelectModel<typeof issuerCompanies>;
export type NewIssuerCompany    = InferInsertModel<typeof issuerCompanies>;

export type BillingClient       = InferSelectModel<typeof billingClients>;
export type NewBillingClient    = InferInsertModel<typeof billingClients>;

export type IssuedInvoice       = InferSelectModel<typeof issuedInvoices>;
export type NewIssuedInvoice    = InferInsertModel<typeof issuedInvoices>;

export type IssuedInvoiceLine   = InferSelectModel<typeof issuedInvoiceLines>;
export type NewIssuedInvoiceLine = InferInsertModel<typeof issuedInvoiceLines>;

export type IssuedInvoiceStatus =
  | 'borrador'
  | 'emitida'
  | 'enviada'
  | 'cobrada'
  | 'vencida'
  | 'anulada';

export type BillingClientType =
  | 'empresa_espana'
  | 'empresa_ue'
  | 'empresa_fuera_ue'
  | 'creador_espana'
  | 'creador_extranjero'
  | 'particular'
  | 'otro';

export type IssuedInvoiceWithRelations = IssuedInvoice & {
  readonly issuerName:   string;
  readonly clientName:   string;
  readonly brandName:    string | null;
  readonly talentName:   string | null;
  readonly dealName:     string | null;
  readonly lines:        readonly IssuedInvoiceLine[];
};
