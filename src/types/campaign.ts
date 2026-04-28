import type { InferSelectModel } from 'drizzle-orm';
import type { campaigns } from '@/db/schema';

export type Campaign = InferSelectModel<typeof campaigns>;
export type CampaignStatus = Campaign['status'];

export type CampaignWithRelations = Campaign & {
  brandName: string | null;
  talentName: string | null;
  ownerName: string | null;
};
