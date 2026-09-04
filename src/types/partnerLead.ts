import type { InferSelectModel } from 'drizzle-orm';

import type { partnerLeadBatches, partnerLeads } from '@/db/schema';

export type PartnerLead = InferSelectModel<typeof partnerLeads>;
export type PartnerLeadBatch = InferSelectModel<typeof partnerLeadBatches>;
export type PartnerLeadOutreachStatus = PartnerLead['outreachStatus'];
export type PartnerLeadRiskLevel = PartnerLead['riskLevel'];
export type PartnerLeadCategory = PartnerLead['category'];
export type PartnerLeadRecommendation = PartnerLead['recommendation'];
