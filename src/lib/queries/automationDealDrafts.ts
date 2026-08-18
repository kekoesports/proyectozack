import 'server-only';

import { and, eq } from 'drizzle-orm';

import { automationDealDrafts } from '@/db/schema/automationDealDrafts';
import { db } from '@/lib/db';
import {
  createAutomatedDeal,
  getAutomatedDealProgress,
  type AutomationDealProgress,
} from '@/lib/queries/automationDeals';
import {
  AutomationDealCreate,
  type AutomationDealDraftCreateInput,
} from '@/lib/schemas/automationDeal';

export class AutomationDealDraftError extends Error {}

export async function createAutomationDealDraft(input: AutomationDealDraftCreateInput) {
  const [inserted] = await db
    .insert(automationDealDrafts)
    .values({
      source: input.source,
      externalId: input.externalId,
      sourceUserId: input.sourceUserId ?? null,
      sourceChannelId: input.sourceChannelId ?? null,
      rawText: input.rawText,
      proposedDeal: input.proposedDeal,
    })
    .onConflictDoNothing()
    .returning();
  if (inserted) return { ...inserted, created: true };

  const [existing] = await db
    .select()
    .from(automationDealDrafts)
    .where(and(
      eq(automationDealDrafts.source, input.source),
      eq(automationDealDrafts.externalId, input.externalId),
    ))
    .limit(1);
  if (!existing) throw new Error('deal-draft-read-after-conflict-failed');
  return { ...existing, created: false };
}

export async function getAutomationDealDraft(id: number) {
  const [draft] = await db
    .select()
    .from(automationDealDrafts)
    .where(eq(automationDealDrafts.id, id))
    .limit(1);
  return draft ?? null;
}

export type ReviewAutomationDealDraftResult = {
  readonly draftId: number;
  readonly status: string;
  readonly progress: AutomationDealProgress | null;
};

export async function reviewAutomationDealDraft(input: {
  readonly id: number;
  readonly action: 'approve' | 'reject';
  readonly reviewedBy: string;
}): Promise<ReviewAutomationDealDraftResult | null> {
  const draft = await getAutomationDealDraft(input.id);
  if (!draft) return null;
  if (draft.status === 'created' && draft.campaignId) {
    return {
      draftId: draft.id,
      status: draft.status,
      progress: await getAutomatedDealProgress(draft.campaignId),
    };
  }
  if (draft.status !== 'pending_review') {
    throw new AutomationDealDraftError(`draft-${draft.status}`);
  }

  const now = new Date();
  if (input.action === 'reject') {
    await db
      .update(automationDealDrafts)
      .set({ status: 'rejected', reviewedBy: input.reviewedBy, reviewedAt: now, updatedAt: now })
      .where(and(
        eq(automationDealDrafts.id, input.id),
        eq(automationDealDrafts.status, 'pending_review'),
      ));
    return { draftId: draft.id, status: 'rejected', progress: null };
  }

  const proposedDeal = AutomationDealCreate.safeParse(draft.proposedDeal);
  if (!proposedDeal.success) throw new AutomationDealDraftError('draft-payload-invalid');
  const deal = await createAutomatedDeal(proposedDeal.data, `draft:${draft.id}`);
  await db
    .update(automationDealDrafts)
    .set({
      status: 'created',
      campaignId: deal.campaignId,
      reviewedBy: input.reviewedBy,
      reviewedAt: now,
      error: null,
      updatedAt: now,
    })
    .where(eq(automationDealDrafts.id, input.id));
  return { draftId: draft.id, status: 'created', progress: deal };
}
