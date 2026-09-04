import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

import { user } from './auth';

export type PartnerLeadEvidence = {
  readonly label: string;
  readonly url: string;
  readonly checkedAt: string;
};

export type PartnerLeadDiscordSnapshot = {
  readonly name: string;
  readonly url: string;
  readonly domain: string;
  readonly creatorFit: string;
  readonly riskLevel: 'green' | 'amber' | 'red';
  readonly recommendation: 'recommended' | 'watch' | 'discard';
  readonly confidence: number;
};

export const partnerLeadCategoryEnum = pgEnum('partner_lead_category', [
  'case-opening',
  'skin-marketplace',
  'skin-trading',
  'esports-betting',
  'gaming-adjacent',
  'other',
]);

export const partnerLeadRiskLevelEnum = pgEnum('partner_lead_risk_level', [
  'green',
  'amber',
  'red',
]);

export const partnerLeadRecommendationEnum = pgEnum('partner_lead_recommendation', [
  'recommended',
  'watch',
  'discard',
]);

export const partnerLeadSpainStatusEnum = pgEnum('partner_lead_spain_status', [
  'review-required',
  'restricted',
  'unknown',
  'not-suitable',
]);

export const partnerLeadOutreachStatusEnum = pgEnum('partner_lead_outreach_status', [
  'nuevo',
  'revision',
  'aprobado',
  'contactado',
  'negociando',
  'descartado',
]);

export const partnerLeadBatches = pgTable(
  'partner_lead_batches',
  {
    id: serial('id').primaryKey(),
    externalId: varchar('external_id', { length: 80 }).notNull(),
    reportSummary: text('report_summary').notNull(),
    candidates: jsonb('candidates').$type<PartnerLeadDiscordSnapshot[]>().notNull().default([]),
    candidateCount: integer('candidate_count').notNull().default(0),
    newLeadCount: integer('new_lead_count').notNull().default(0),
    updatedLeadCount: integer('updated_lead_count').notNull().default(0),
    discardedCount: integer('discarded_count').notNull().default(0),
    researchedAt: timestamp('researched_at', { withTimezone: true }).notNull(),
    discordNotifiedAt: timestamp('discord_notified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('partner_lead_batches_external_id_uq').on(table.externalId),
    index('partner_lead_batches_researched_at_idx').on(table.researchedAt),
    index('partner_lead_batches_discord_pending_idx')
      .on(table.createdAt)
      .where(sql`${table.discordNotifiedAt} is null`),
  ],
);

export const partnerLeads = pgTable(
  'partner_leads',
  {
    id: serial('id').primaryKey(),
    domain: varchar('domain', { length: 255 }).notNull(),
    name: varchar('name', { length: 300 }).notNull(),
    url: text('url').notNull(),
    category: partnerLeadCategoryEnum('category').notNull(),
    companyName: varchar('company_name', { length: 300 }),
    jurisdiction: varchar('jurisdiction', { length: 160 }),
    countryCode: varchar('country_code', { length: 2 }),
    languages: jsonb('languages').$type<string[]>().notNull().default([]),
    summary: text('summary').notNull(),
    creatorFit: text('creator_fit').notNull(),
    contactEmail: varchar('contact_email', { length: 320 }),
    contactUrl: text('contact_url'),
    commercialProgramUrl: text('commercial_program_url'),
    termsUrl: text('terms_url'),
    licenceUrl: text('licence_url'),
    companyEvidence: text('company_evidence'),
    licenceEvidence: text('licence_evidence'),
    spainStatus: partnerLeadSpainStatusEnum('spain_status').notNull(),
    spainSuitability: text('spain_suitability').notNull(),
    reliabilityEvidence: jsonb('reliability_evidence')
      .$type<PartnerLeadEvidence[]>()
      .notNull()
      .default([]),
    riskFlags: jsonb('risk_flags').$type<string[]>().notNull().default([]),
    riskLevel: partnerLeadRiskLevelEnum('risk_level').notNull(),
    recommendation: partnerLeadRecommendationEnum('recommendation').notNull(),
    confidence: integer('confidence').notNull(),
    lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }).notNull(),
    lastBatchId: integer('last_batch_id').references(() => partnerLeadBatches.id, {
      onDelete: 'set null',
    }),
    outreachStatus: partnerLeadOutreachStatusEnum('outreach_status').notNull().default('nuevo'),
    notes: text('notes'),
    assignedToUserId: text('assigned_to_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    lastContactedAt: timestamp('last_contacted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('partner_leads_domain_uq').on(table.domain),
    index('partner_leads_outreach_status_idx').on(table.outreachStatus),
    index('partner_leads_risk_level_idx').on(table.riskLevel),
    index('partner_leads_recommendation_idx').on(table.recommendation),
    index('partner_leads_last_verified_idx').on(table.lastVerifiedAt),
    index('partner_leads_last_batch_idx').on(table.lastBatchId),
    check('partner_leads_confidence_range', sql`${table.confidence} between 0 and 100`),
  ],
);
