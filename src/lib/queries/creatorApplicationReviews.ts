import 'server-only';

import { desc, eq } from 'drizzle-orm';

import {
  contactSubmissions,
  creatorApplications,
  creatorOutreachSources,
  creatorOutreachThreads,
} from '@/db/schema';
import { db } from '@/lib/db';
import type { InboundCreatorApplication } from '@/lib/queries/inboundCreatorApplications';
import type {
  CreatorOutreachStatus,
  CreatorReviewDecision,
  CreatorReviewSourceType,
} from '@/lib/schemas/creator-outreach';

export type CreatorApplicationReview = {
  readonly sourceType: CreatorReviewSourceType;
  readonly sourceId: number;
  readonly createdAt: Date;
  readonly name: string;
  readonly email: string;
  readonly country: string | null;
  readonly platform: string;
  readonly handle: string;
  readonly contentCategory: string | null;
  readonly followers: string | null;
  readonly averageAudience: string | null;
  readonly otherLinks: string | null;
  readonly message: string | null;
  readonly outreachStatus: CreatorOutreachStatus | 'not_contacted';
  readonly reviewDecision: CreatorReviewDecision | null;
  readonly qualificationReason: string | null;
  readonly internalNotes: string | null;
  readonly lastOutboundAt: Date | null;
  readonly lastInboundAt: Date | null;
};

type ReviewState = Pick<
  CreatorApplicationReview,
  'outreachStatus' | 'reviewDecision' | 'qualificationReason' | 'internalNotes' | 'lastOutboundAt' | 'lastInboundAt'
>;

const EMPTY_STATE: ReviewState = {
  outreachStatus: 'not_contacted',
  reviewDecision: null,
  qualificationReason: null,
  internalNotes: null,
  lastOutboundAt: null,
  lastInboundAt: null,
};

async function reviewStateBySource(): Promise<Map<string, ReviewState>> {
  const rows = await db.select({
    sourceType: creatorOutreachSources.sourceType,
    sourceId: creatorOutreachSources.sourceId,
    status: creatorOutreachThreads.status,
    reviewDecision: creatorOutreachThreads.reviewDecision,
    qualificationReason: creatorOutreachThreads.qualificationReason,
    internalNotes: creatorOutreachThreads.internalNotes,
    lastOutboundAt: creatorOutreachThreads.lastOutboundAt,
    lastInboundAt: creatorOutreachThreads.lastInboundAt,
  }).from(creatorOutreachSources)
    .innerJoin(creatorOutreachThreads, eq(creatorOutreachThreads.id, creatorOutreachSources.threadId));

  return new Map(rows.map((row) => [`${row.sourceType}:${row.sourceId}`, {
    outreachStatus: row.status as CreatorOutreachStatus,
    reviewDecision: row.reviewDecision as CreatorReviewDecision | null,
    qualificationReason: row.qualificationReason,
    internalNotes: row.internalNotes,
    lastOutboundAt: row.lastOutboundAt,
    lastInboundAt: row.lastInboundAt,
  }]));
}

export async function listCreatorApplicationReviews(): Promise<readonly CreatorApplicationReview[]> {
  const [applications, leads, states] = await Promise.all([
    db.select().from(creatorApplications).orderBy(desc(creatorApplications.createdAt)),
    db.select().from(contactSubmissions)
      .where(eq(contactSubmissions.type, 'talent'))
      .orderBy(desc(contactSubmissions.createdAt)),
    reviewStateBySource(),
  ]);

  return [
    ...applications.map((item): CreatorApplicationReview => ({
      sourceType: 'creator_application',
      sourceId: item.id,
      createdAt: item.createdAt,
      name: item.name,
      email: item.email,
      country: item.country,
      platform: item.platform,
      handle: item.handle,
      contentCategory: item.contentCategory,
      followers: item.followers,
      averageAudience: item.averageAudience,
      otherLinks: item.otherLinks,
      message: item.message,
      ...(states.get(`creator_application:${item.id}`) ?? EMPTY_STATE),
    })),
    ...leads.map((item): CreatorApplicationReview => ({
      sourceType: 'contact_submission',
      sourceId: item.id,
      createdAt: item.createdAt,
      name: item.name,
      email: item.email,
      country: item.country,
      platform: item.platform ?? '',
      handle: item.channelUrl ?? item.company ?? '',
      contentCategory: item.contentCategory,
      followers: item.followers ?? item.viewers,
      averageAudience: item.averageAudience,
      otherLinks: item.otherLinks,
      message: item.message,
      ...(states.get(`contact_submission:${item.id}`) ?? EMPTY_STATE),
    })),
  ].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
}

export async function getCreatorApplicationReview(
  sourceType: CreatorReviewSourceType,
  sourceId: number,
): Promise<CreatorApplicationReview | null> {
  const reviews = await listCreatorApplicationReviews();
  return reviews.find((item) => item.sourceType === sourceType && item.sourceId === sourceId) ?? null;
}

export function toInboundCreatorApplication(item: CreatorApplicationReview): InboundCreatorApplication {
  return {
    sourceId: `${item.sourceType === 'creator_application' ? 'creator' : 'lead'}:${item.sourceId}`,
    createdAt: item.createdAt,
    name: item.name,
    email: item.email,
    country: item.country,
    declaredPlatform: item.platform,
    declaredHandle: item.handle,
    declaredContent: item.contentCategory,
    declaredAudience: item.followers,
    declaredAverageAudience: item.averageAudience,
    otherLinks: item.otherLinks,
    message: item.message,
    outreachStatus: item.outreachStatus,
    lastContactAt: item.lastOutboundAt ?? item.lastInboundAt,
    replySummary: item.qualificationReason,
  };
}
