import 'server-only';

import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';

import { partnerLeadBatches, partnerLeads } from '@/db/schema';
import { db } from '@/lib/db';
import type { PartnerLeadBatchIntake } from '@/lib/schemas/partnerLead';
import type {
  PartnerLead,
  PartnerLeadBatch,
  PartnerLeadOutreachStatus,
} from '@/types';

export type PartnerLeadBatchResult = {
  readonly batchDbId: number;
  readonly batchId: string;
  readonly created: boolean;
  readonly candidateCount: number;
  readonly newLeadCount: number;
  readonly updatedLeadCount: number;
  readonly discardedCount: number;
};

function normalizeDomain(url: string): string {
  return new URL(url).hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
}

function batchResult(batch: PartnerLeadBatch, created: boolean): PartnerLeadBatchResult {
  return {
    batchDbId: batch.id,
    batchId: batch.externalId,
    created,
    candidateCount: batch.candidateCount,
    newLeadCount: batch.newLeadCount,
    updatedLeadCount: batch.updatedLeadCount,
    discardedCount: batch.discardedCount,
  };
}

/**
 * Persiste un informe diario de forma atómica e idempotente.
 *
 * El `batchId` identifica el informe completo. Un reintento devuelve el lote
 * existente y no vuelve a tocar los leads ni a crear otra notificación.
 * El upsert por dominio refresca la diligencia debida sin pisar el pipeline
 * comercial (owner, notas y estado de outreach).
 */
export async function upsertPartnerLeadBatch(
  input: PartnerLeadBatchIntake,
): Promise<PartnerLeadBatchResult> {
  return db.transaction(async (tx) => {
    const candidates = input.leads.map((lead) => ({
      name: lead.name,
      url: lead.url,
      domain: normalizeDomain(lead.url),
      creatorFit: lead.creatorFit,
      riskLevel: lead.riskLevel,
      recommendation: lead.recommendation,
      confidence: lead.confidence,
    }));

    const [createdBatch] = await tx
      .insert(partnerLeadBatches)
      .values({
        externalId: input.batchId,
        reportSummary: input.reportSummary,
        candidates,
        candidateCount: input.leads.length,
        discardedCount: input.leads.filter((lead) => lead.recommendation === 'discard').length,
        researchedAt: new Date(input.researchedAt),
      })
      .onConflictDoNothing({ target: partnerLeadBatches.externalId })
      .returning();
    if (!createdBatch) {
      const [existingBatch] = await tx
        .select()
        .from(partnerLeadBatches)
        .where(eq(partnerLeadBatches.externalId, input.batchId))
        .limit(1);
      if (!existingBatch) throw new Error('partner-lead-batch-not-created');
      return batchResult(existingBatch, false);
    }

    if (input.leads.length === 0) return batchResult(createdBatch, true);

    const now = new Date();
    const values = input.leads.map((lead) => ({
      domain: normalizeDomain(lead.url),
      name: lead.name,
      url: lead.url,
      category: lead.category,
      companyName: lead.companyName ?? null,
      jurisdiction: lead.jurisdiction ?? null,
      countryCode: lead.countryCode ?? null,
      languages: lead.languages,
      summary: lead.summary,
      creatorFit: lead.creatorFit,
      contactEmail: lead.contactEmail ?? null,
      contactUrl: lead.contactUrl ?? null,
      commercialProgramUrl: lead.commercialProgramUrl ?? null,
      termsUrl: lead.termsUrl ?? null,
      licenceUrl: lead.licenceUrl ?? null,
      companyEvidence: lead.companyEvidence ?? null,
      licenceEvidence: lead.licenceEvidence ?? null,
      spainStatus: lead.spainStatus,
      spainSuitability: lead.spainSuitability,
      reliabilityEvidence: lead.reliabilityEvidence,
      riskFlags: lead.riskFlags,
      riskLevel: lead.riskLevel,
      recommendation: lead.recommendation,
      confidence: lead.confidence,
      lastVerifiedAt: new Date(lead.verifiedAt),
      lastBatchId: createdBatch.id,
      outreachStatus: lead.recommendation === 'discard' ? 'descartado' as const : 'nuevo' as const,
      updatedAt: now,
    }));

    const rows = await tx
      .insert(partnerLeads)
      .values(values)
      .onConflictDoUpdate({
        target: partnerLeads.domain,
        set: {
          name: sql`excluded.name`,
          url: sql`excluded.url`,
          category: sql`excluded.category`,
          companyName: sql`excluded.company_name`,
          jurisdiction: sql`excluded.jurisdiction`,
          countryCode: sql`excluded.country_code`,
          languages: sql`excluded.languages`,
          summary: sql`excluded.summary`,
          creatorFit: sql`excluded.creator_fit`,
          contactEmail: sql`excluded.contact_email`,
          contactUrl: sql`excluded.contact_url`,
          commercialProgramUrl: sql`excluded.commercial_program_url`,
          termsUrl: sql`excluded.terms_url`,
          licenceUrl: sql`excluded.licence_url`,
          companyEvidence: sql`excluded.company_evidence`,
          licenceEvidence: sql`excluded.licence_evidence`,
          spainStatus: sql`excluded.spain_status`,
          spainSuitability: sql`excluded.spain_suitability`,
          reliabilityEvidence: sql`excluded.reliability_evidence`,
          riskFlags: sql`excluded.risk_flags`,
          riskLevel: sql`excluded.risk_level`,
          recommendation: sql`excluded.recommendation`,
          confidence: sql`excluded.confidence`,
          lastVerifiedAt: sql`excluded.last_verified_at`,
          lastBatchId: createdBatch.id,
          updatedAt: now,
        },
      })
      .returning({ id: partnerLeads.id, xmax: sql<string>`xmax::text` });

    const newLeadCount = rows.filter((row) => row.xmax === '0').length;
    const updatedLeadCount = rows.length - newLeadCount;
    const [updatedBatch] = await tx
      .update(partnerLeadBatches)
      .set({ newLeadCount, updatedLeadCount })
      .where(eq(partnerLeadBatches.id, createdBatch.id))
      .returning();
    if (!updatedBatch) throw new Error('partner-lead-batch-not-updated');

    return batchResult(updatedBatch, true);
  });
}

/** @cache none @visibility admin */
export async function getAllPartnerLeads(): Promise<readonly PartnerLead[]> {
  return db.select().from(partnerLeads).orderBy(desc(partnerLeads.lastVerifiedAt));
}

/** @cache none @visibility admin */
export async function getRecentPartnerLeadBatches(limit = 14): Promise<readonly PartnerLeadBatch[]> {
  return db
    .select()
    .from(partnerLeadBatches)
    .orderBy(desc(partnerLeadBatches.researchedAt))
    .limit(Math.max(1, Math.min(60, Math.trunc(limit))));
}

export async function updatePartnerLeadOutreachStatus(
  id: number,
  status: PartnerLeadOutreachStatus,
  userId: string,
): Promise<void> {
  const now = new Date();
  const contacted = status === 'contactado';
  await db
    .update(partnerLeads)
    .set({
      outreachStatus: status,
      assignedToUserId: contacted ? userId : undefined,
      lastContactedAt: contacted ? now : undefined,
      updatedAt: now,
    })
    .where(eq(partnerLeads.id, id));
}

export async function updatePartnerLeadNotes(id: number, notes: string): Promise<void> {
  await db
    .update(partnerLeads)
    .set({ notes, updatedAt: new Date() })
    .where(eq(partnerLeads.id, id));
}

export type PendingPartnerLeadBatch = Pick<
  PartnerLeadBatch,
  'id' | 'externalId' | 'reportSummary' | 'candidates' | 'candidateCount' | 'newLeadCount' |
  'updatedLeadCount' | 'discardedCount' | 'researchedAt'
>;

export async function listPendingPartnerLeadBatches(
  limit = 25,
): Promise<readonly PendingPartnerLeadBatch[]> {
  return db
    .select({
      id: partnerLeadBatches.id,
      externalId: partnerLeadBatches.externalId,
      reportSummary: partnerLeadBatches.reportSummary,
      candidates: partnerLeadBatches.candidates,
      candidateCount: partnerLeadBatches.candidateCount,
      newLeadCount: partnerLeadBatches.newLeadCount,
      updatedLeadCount: partnerLeadBatches.updatedLeadCount,
      discardedCount: partnerLeadBatches.discardedCount,
      researchedAt: partnerLeadBatches.researchedAt,
    })
    .from(partnerLeadBatches)
    .where(isNull(partnerLeadBatches.discordNotifiedAt))
    .orderBy(asc(partnerLeadBatches.createdAt))
    .limit(Math.max(1, Math.min(100, Math.trunc(limit))));
}

export type PartnerLeadNotificationAck = 'acknowledged' | 'already_acknowledged' | 'not_found';

export async function acknowledgePartnerLeadBatch(
  id: number,
): Promise<PartnerLeadNotificationAck> {
  const [updated] = await db
    .update(partnerLeadBatches)
    .set({ discordNotifiedAt: new Date() })
    .where(and(eq(partnerLeadBatches.id, id), isNull(partnerLeadBatches.discordNotifiedAt)))
    .returning({ id: partnerLeadBatches.id });
  if (updated) return 'acknowledged';

  const [existing] = await db
    .select({ discordNotifiedAt: partnerLeadBatches.discordNotifiedAt })
    .from(partnerLeadBatches)
    .where(eq(partnerLeadBatches.id, id))
    .limit(1);
  return existing?.discordNotifiedAt ? 'already_acknowledged' : 'not_found';
}
