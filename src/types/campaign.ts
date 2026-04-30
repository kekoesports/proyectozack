import type { InferSelectModel } from 'drizzle-orm';
import type { campaigns } from '@/db/schema';
import type { CampaignPaymentDerivedStatus, CampaignDerived } from '@/lib/schemas/campaign';

export type Campaign = InferSelectModel<typeof campaigns>;
export type CampaignStatus = Campaign['status'];

/**
 * Enriched campaign shape returned by getCampaignWithRelations and expected by
 * admin components. The `brandName`/`talentName` flat fields are used for list
 * views; the nested `brand`/`talent` objects are optional extras.
 */
export type CampaignWithRelations = Campaign &
  CampaignDerived & {
    brandName: string | null;
    talentName: string | null;
    ownerName: string | null;
    brandPaid: CampaignPaymentDerivedStatus;
    talentPaid: CampaignPaymentDerivedStatus;
    totalInvoicedBrand: number;
    totalPaidTalent: number;
    brand?: { id: number; name: string; sector: string | null; geo: string | null };
    talent?: {
      id: number;
      name: string;
      slug: string;
      photoUrl: string | null;
      cnmcStatus: 'registrado' | 'pendiente' | 'en_tramite' | 'no_aplica' | null;
    };
    brandContact?: { id: number; name: string; email: string | null } | null;
    responsibleUser?: { id: string; name: string } | null;
  };
