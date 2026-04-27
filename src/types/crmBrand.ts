import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { crmBrands, crmBrandContacts, crmBrandFollowups } from '@/db/schema';
import type { BrandFollowupDerivedStatus } from '@/lib/schemas/crmBrand';

export type CrmBrand = InferSelectModel<typeof crmBrands>;
export type NewCrmBrand = InferInsertModel<typeof crmBrands>;
export type CrmBrandStatus = CrmBrand['status'];

export type CrmBrandContact = InferSelectModel<typeof crmBrandContacts>;
export type NewCrmBrandContact = InferInsertModel<typeof crmBrandContacts>;

export type CrmBrandFollowup = InferSelectModel<typeof crmBrandFollowups>;
export type NewCrmBrandFollowup = InferInsertModel<typeof crmBrandFollowups>;

export type CrmBrandFollowupWithBrand = CrmBrandFollowup & {
  readonly brandName: string;
};

export type CrmBrandWithContacts = CrmBrand & {
  readonly contacts: readonly CrmBrandContact[];
};

export type CrmBrandRow = CrmBrand & {
  readonly contactCount: number;
  readonly primaryContact: CrmBrandContact | null;
  readonly ownerName: string | null;
};

export type CrmBrandWithDerived = CrmBrandRow & {
  readonly followupStatus: BrandFollowupDerivedStatus;
};
