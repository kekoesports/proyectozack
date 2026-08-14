'server-only';

import { and, desc, eq } from 'drizzle-orm';
import { communicationDrafts } from '@/db/schema';
import { db } from '@/lib/db';
import type {
  DraftCreate,
  DraftProviderPatch,
  DraftReview,
} from '@/lib/schemas/integrationApi';

type DraftFilters = {
  status?: 'pending_approval' | 'approved' | 'rejected' | 'sending' | 'sent' | 'failed' | undefined;
  channel?: 'email' | 'telegram' | 'discord' | 'whatsapp' | 'phone' | 'meeting' | 'system' | 'other' | undefined;
  limit: number;
  offset: number;
};

export async function listCommunicationDrafts(filters: DraftFilters) {
  const conditions = [];
  if (filters.status) conditions.push(eq(communicationDrafts.status, filters.status));
  if (filters.channel) conditions.push(eq(communicationDrafts.channel, filters.channel));
  return db
    .select()
    .from(communicationDrafts)
    .where(and(...conditions))
    .orderBy(desc(communicationDrafts.createdAt))
    .limit(filters.limit)
    .offset(filters.offset);
}

export async function createCommunicationDraft(input: DraftCreate) {
  const [row] = await db
    .insert(communicationDrafts)
    .values({
      channel: input.channel,
      status: 'pending_approval',
      purpose: input.purpose,
      recipient: input.recipient,
      subject: input.subject ?? null,
      body: input.body,
      model: input.model ?? null,
      automationKey: input.automationKey ?? null,
      riskLevel: input.riskLevel,
      brandId: input.brandId ?? null,
      campaignId: input.campaignId ?? null,
      talentId: input.talentId ?? null,
      sourceActivityId: input.sourceActivityId ?? null,
      metadata: input.metadata ?? null,
    })
    .onConflictDoNothing({ target: communicationDrafts.automationKey })
    .returning();
  if (row) return { draft: row, created: true };
  if (!input.automationKey) throw new Error('Draft insert returned no row');
  const [existing] = await db
    .select()
    .from(communicationDrafts)
    .where(eq(communicationDrafts.automationKey, input.automationKey))
    .limit(1);
  if (!existing) throw new Error('Draft automation key lookup returned no row');
  return { draft: existing, created: false };
}

export async function recordDraftProviderResult(id: number, input: DraftProviderPatch) {
  const [existing] = await db
    .select()
    .from(communicationDrafts)
    .where(eq(communicationDrafts.id, id))
    .limit(1);
  if (!existing) return { outcome: 'not_found' as const };
  if (existing.status === input.status) return { outcome: 'unchanged' as const, draft: existing };
  if (existing.status !== 'approved') return { outcome: 'invalid_state' as const, draft: existing };

  const now = new Date();
  const [row] = await db
    .update(communicationDrafts)
    .set(input.status === 'sent'
      ? {
          status: 'sent',
          sentAt: input.sentAt ? new Date(input.sentAt) : now,
          providerMessageId: input.providerMessageId,
          failureCode: null,
          updatedAt: now,
        }
      : {
          status: 'failed',
          failureCode: input.failureCode,
          updatedAt: now,
        })
    .where(and(eq(communicationDrafts.id, id), eq(communicationDrafts.status, 'approved')))
    .returning();
  return row
    ? { outcome: 'updated' as const, draft: row }
    : { outcome: 'invalid_state' as const };
}

export async function reviewCommunicationDraft(
  id: number,
  input: DraftReview,
  reviewedByUserId: string,
) {
  const now = new Date();
  const [row] = await db
    .update(communicationDrafts)
    .set(input.decision === 'approve'
      ? {
          status: 'approved',
          approvedAt: now,
          rejectedAt: null,
          reviewedByUserId,
          reviewNote: input.note ?? null,
          updatedAt: now,
        }
      : {
          status: 'rejected',
          rejectedAt: now,
          approvedAt: null,
          reviewedByUserId,
          reviewNote: input.note ?? null,
          updatedAt: now,
        })
    .where(and(eq(communicationDrafts.id, id), eq(communicationDrafts.status, 'pending_approval')))
    .returning();
  return row ?? null;
}
