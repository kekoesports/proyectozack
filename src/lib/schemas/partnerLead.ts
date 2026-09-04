import { z } from 'zod';

import {
  partnerLeadCategoryEnum,
  partnerLeadOutreachStatusEnum,
  partnerLeadRecommendationEnum,
  partnerLeadRiskLevelEnum,
  partnerLeadSpainStatusEnum,
} from '@/db/schema';

const HttpUrl = z.string().trim().url().max(2_000).refine(
  (value) => value.startsWith('https://') || value.startsWith('http://'),
  'La URL debe usar http o https',
);

const OptionalHttpUrl = HttpUrl.nullish();

export const PartnerLeadEvidenceInput = z.object({
  label: z.string().trim().min(1).max(200),
  url: HttpUrl,
  checkedAt: z.string().datetime({ offset: true }),
});

export const PartnerLeadIntakeItem = z.object({
  name: z.string().trim().min(1).max(300),
  url: HttpUrl,
  category: z.enum(partnerLeadCategoryEnum.enumValues),
  companyName: z.string().trim().min(1).max(300).nullish(),
  jurisdiction: z.string().trim().min(1).max(160).nullish(),
  countryCode: z.string().trim().regex(/^[A-Za-z]{2}$/).transform((value) => value.toUpperCase()).nullish(),
  languages: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  summary: z.string().trim().min(1).max(2_000),
  creatorFit: z.string().trim().min(1).max(1_000),
  contactEmail: z.string().trim().email().max(320).nullish(),
  contactUrl: OptionalHttpUrl,
  commercialProgramUrl: OptionalHttpUrl,
  termsUrl: OptionalHttpUrl,
  licenceUrl: OptionalHttpUrl,
  companyEvidence: z.string().trim().min(1).max(2_000).nullish(),
  licenceEvidence: z.string().trim().min(1).max(2_000).nullish(),
  spainStatus: z.enum(partnerLeadSpainStatusEnum.enumValues),
  spainSuitability: z.string().trim().min(1).max(2_000),
  reliabilityEvidence: z.array(PartnerLeadEvidenceInput).min(1).max(16),
  riskFlags: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  riskLevel: z.enum(partnerLeadRiskLevelEnum.enumValues),
  recommendation: z.enum(partnerLeadRecommendationEnum.enumValues),
  confidence: z.number().int().min(0).max(100),
  verifiedAt: z.string().datetime({ offset: true }),
});

export const PartnerLeadBatchIntake = z.object({
  batchId: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{7,79}$/),
  researchedAt: z.string().datetime({ offset: true }),
  reportSummary: z.string().trim().min(1).max(3_000),
  leads: z.array(PartnerLeadIntakeItem).max(20),
}).superRefine((value, context) => {
  const domains = new Set<string>();
  value.leads.forEach((lead, index) => {
    const domain = new URL(lead.url).hostname.toLowerCase().replace(/^www\./, '');
    if (domains.has(domain)) {
      context.addIssue({
        code: 'custom',
        path: ['leads', index, 'url'],
        message: 'El dominio está duplicado dentro del lote',
      });
    }
    domains.add(domain);
  });
});

export const PartnerLeadRouteId = z.coerce.number().int().positive();

export const PartnerLeadStatusUpdate = z.object({
  id: z.number().int().positive(),
  status: z.enum(partnerLeadOutreachStatusEnum.enumValues),
});

export const PartnerLeadNotesUpdate = z.object({
  id: z.number().int().positive(),
  notes: z.string().max(4_000),
});

export type PartnerLeadBatchIntake = z.infer<typeof PartnerLeadBatchIntake>;
