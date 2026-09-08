import { asc, eq, inArray } from 'drizzle-orm';

import { creatorApplications, contactSubmissions, creatorOutreachThreads, targets } from '@/db/schema';
import { db } from '@/lib/db';

export type InboundCreatorApplication = {
  readonly sourceId: string;
  readonly createdAt: Date;
  readonly name: string;
  readonly email: string;
  readonly country: string | null;
  readonly declaredPlatform: string;
  readonly declaredHandle: string;
  readonly declaredContent: string | null;
  readonly declaredAudience: string | null;
  readonly declaredAverageAudience: string | null;
  readonly otherLinks: string | null;
  readonly message: string | null;
  readonly outreachStatus: string;
  readonly lastContactAt: Date | null;
  readonly replySummary: string | null;
};

/**
 * Une los dos formularios que aceptan candidaturas de creadores. El ID lleva
 * prefijo de origen para que la sincronización con Sheets sea idempotente.
 */
export async function listInboundCreatorApplications(): Promise<InboundCreatorApplication[]> {
  const [applications, leads, contactedTargets] = await Promise.all([
    db.select().from(creatorApplications).orderBy(asc(creatorApplications.createdAt)),
    db.select().from(contactSubmissions)
      .where(eq(contactSubmissions.type, 'talent'))
      .orderBy(asc(contactSubmissions.createdAt)),
    db.select().from(targets)
      .where(inArray(targets.status, ['contactado', 'finalizado']))
      .orderBy(asc(targets.createdAt)),
  ]);

  const candidates = [
    ...applications.map((item) => ({
      sourceId: `creator:${item.id}`,
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
    })),
    ...leads.map((item) => ({
      sourceId: `lead:${item.id}`,
      createdAt: item.createdAt,
      name: item.name,
      email: item.email,
      country: item.country,
      declaredPlatform: item.platform ?? '',
      declaredHandle: item.channelUrl ?? item.company ?? '',
      declaredContent: item.contentCategory,
      declaredAudience: item.followers ?? item.viewers,
      declaredAverageAudience: item.averageAudience,
      otherLinks: item.otherLinks,
      message: item.message,
    })),
    ...contactedTargets.flatMap((item) => item.contactEmail ? [{
      sourceId: `target:${item.id}`,
      createdAt: item.contactedAt ?? item.createdAt,
      name: item.fullName?.trim() || item.username,
      email: item.contactEmail,
      country: item.countryCode,
      declaredPlatform: item.platform,
      declaredHandle: item.profileUrl,
      declaredContent: item.bio,
      declaredAudience: item.followers == null ? null : String(item.followers),
      declaredAverageAudience: item.avgRecentVideoViews == null ? null : String(item.avgRecentVideoViews),
      otherLinks: item.externalUrl,
      message: item.bio,
    }] : []),
  ];
  const emails = [...new Set(candidates.map((item) => item.email.trim().toLowerCase()))];
  const threads = emails.length === 0 ? [] : await db.select({
    email: creatorOutreachThreads.normalizedEmail,
    status: creatorOutreachThreads.status,
    lastOutboundAt: creatorOutreachThreads.lastOutboundAt,
    lastInboundAt: creatorOutreachThreads.lastInboundAt,
    lastReplySummary: creatorOutreachThreads.lastReplySummary,
    qualificationReason: creatorOutreachThreads.qualificationReason,
  }).from(creatorOutreachThreads).where(inArray(creatorOutreachThreads.normalizedEmail, emails));
  const byEmail = new Map(threads.map((thread) => [thread.email, thread]));
  const deduplicated = new Map<string, typeof candidates[number]>();
  for (const candidate of candidates) {
    const key = candidate.email.trim().toLowerCase();
    if (!deduplicated.has(key)) deduplicated.set(key, candidate);
  }
  return [...deduplicated.values()].map((item) => {
    const outreach = byEmail.get(item.email.trim().toLowerCase());
    return {
      ...item,
      outreachStatus: outreach?.status ?? 'not_contacted',
      lastContactAt: latestDate(outreach?.lastOutboundAt ?? null, outreach?.lastInboundAt ?? null),
      replySummary: outreach?.lastReplySummary ?? outreach?.qualificationReason ?? null,
    };
  }).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

function latestDate(left: Date | null, right: Date | null): Date | null {
  if (!left) return right;
  if (!right) return left;
  return left.getTime() >= right.getTime() ? left : right;
}
