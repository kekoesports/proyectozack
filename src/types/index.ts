// Re-export all types from domain files — import from '@/types' as before.
export type * from './talent';
export type * from './aiAssistant';
export type * from './case';
export type * from './brand';
export type * from './giveaway';
export type * from './content';
export type * from './analytics';
export type * from './target';
export type * from './crmTask';
export type * from './crmTaskTemplate';
export type * from './crmBrand';
export type * from './invoice';
export type * from './invoiceImport';
export type * from './campaign';
export type * from './talentBusiness';
export type * from './invoiceExtract';
export type * from './issuedInvoice';
export type * from './brandBrief';
export type * from './contract';
export type * from './pressTarget';
export type * from './crmEvent';
export type { BrandFollowupDerivedStatus } from '@/lib/schemas/crmBrand';
export type { FileType, FileRelatedType } from '@/lib/schemas/file';
export type * from './bankReconciliation';
export type * from './invoicePayment';
export type * from './financeDashboard';

import type { InferSelectModel } from 'drizzle-orm';
import type { files, campaigns } from '@/db/schema';
import type { CampaignDerived, CampaignPaymentDerivedStatus } from '@/lib/schemas/campaign';

export type FileRecord = InferSelectModel<typeof files>;

export type CampaignRow = InferSelectModel<typeof campaigns>;
export type Campaign = CampaignRow & CampaignDerived & {
  readonly brandPaid: CampaignPaymentDerivedStatus;
  readonly talentPaid: CampaignPaymentDerivedStatus;
  readonly totalInvoicedBrand: number;
  readonly totalPaidTalent: number;
};
