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
  type AutomationDealDraftReviewInput,
} from '@/lib/schemas/automationDeal';

export class AutomationDealDraftError extends Error {}

function formatIssuePath(path: readonly PropertyKey[]): string {
  return path.length > 0 ? path.map(String).join('.') : 'proposedDeal';
}

export function getAutomationDealMissingFields(proposedDeal: unknown): string[] {
  const parsed = AutomationDealCreate.safeParse(proposedDeal);
  if (parsed.success) return [];
  return Array.from(new Set(parsed.error.issues.map((issue) => formatIssuePath(issue.path))));
}

function isDealDraftReady(proposedDeal: unknown): boolean {
  return getAutomationDealMissingFields(proposedDeal).length === 0;
}

export async function createAutomationDealDraft(input: AutomationDealDraftCreateInput) {
  const proposedDeal = input.proposedDeal ?? {};
  const missingFields = getAutomationDealMissingFields(proposedDeal);
  const [inserted] = await db
    .insert(automationDealDrafts)
    .values({
      source: input.source,
      externalId: input.externalId,
      sourceUserId: input.sourceUserId ?? null,
      sourceChannelId: input.sourceChannelId ?? null,
      rawText: input.rawText,
      proposedDeal,
      status: missingFields.length > 0 ? 'missing_info' : 'pending_review',
      error: missingFields.length > 0 ? `missing:${missingFields.join(',')}` : null,
    })
    .onConflictDoNothing()
    .returning();
  if (inserted) return { ...inserted, created: true, missingFields };

  const [existing] = await db
    .select()
    .from(automationDealDrafts)
    .where(and(
      eq(automationDealDrafts.source, input.source),
      eq(automationDealDrafts.externalId, input.externalId),
    ))
    .limit(1);
  if (!existing) throw new Error('deal-draft-read-after-conflict-failed');
  return {
    ...existing,
    created: false,
    missingFields: getAutomationDealMissingFields(existing.proposedDeal),
  };
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
  readonly missingFields: readonly string[];
  readonly progress: AutomationDealProgress | null;
};

export async function reviewAutomationDealDraft(input: {
  readonly id: number;
} & AutomationDealDraftReviewInput): Promise<ReviewAutomationDealDraftResult | null> {
  const draft = await getAutomationDealDraft(input.id);
  if (!draft) return null;
  if (draft.status === 'created' && draft.campaignId) {
    return {
      draftId: draft.id,
      status: draft.status,
      missingFields: [],
      progress: await getAutomatedDealProgress(draft.campaignId),
    };
  }
  if (input.action === 'update') {
    if (!['missing_info', 'pending_review'].includes(draft.status)) {
      throw new AutomationDealDraftError(`draft-${draft.status}`);
    }
    const missingFields = getAutomationDealMissingFields(input.proposedDeal);
    const nextStatus = missingFields.length > 0 ? 'missing_info' : 'pending_review';
    const now = new Date();
    await db
      .update(automationDealDrafts)
      .set({
        proposedDeal: input.proposedDeal,
        status: nextStatus,
        reviewedBy: input.reviewedBy,
        error: missingFields.length > 0 ? `missing:${missingFields.join(',')}` : null,
        updatedAt: now,
      })
      .where(eq(automationDealDrafts.id, input.id));
    return { draftId: draft.id, status: nextStatus, missingFields, progress: null };
  }

  if (!['missing_info', 'pending_review'].includes(draft.status)) {
    throw new AutomationDealDraftError(`draft-${draft.status}`);
  }

  const now = new Date();
  if (input.action === 'reject') {
    await db
      .update(automationDealDrafts)
      .set({ status: 'rejected', reviewedBy: input.reviewedBy, reviewedAt: now, updatedAt: now })
      .where(and(
        eq(automationDealDrafts.id, input.id),
        eq(automationDealDrafts.status, draft.status),
      ));
    return { draftId: draft.id, status: 'rejected', missingFields: [], progress: null };
  }

  if (!isDealDraftReady(draft.proposedDeal)) {
    throw new AutomationDealDraftError('draft-missing_info');
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
  return { draftId: draft.id, status: 'created', missingFields: [], progress: deal };
}
