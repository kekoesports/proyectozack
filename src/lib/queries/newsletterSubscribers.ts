import { db } from '@/lib/db';
import { emailSuppressions, newsletterSubscribers } from '@/db/schema';
import { count, desc, eq, getTableColumns, sql } from 'drizzle-orm';
import type { NewsletterSubscriber } from '@/db/schema/newsletterSubscribers';

export type { NewsletterSubscriber };
export type NewsletterSubscriberRow = NewsletterSubscriber & {
  suppressionReason: string | null;
};

export async function listNewsletterSubscribers(opts?: {
  status?: 'active' | 'unsubscribed';
  consent?: 'newsletter' | 'marketing';
}): Promise<NewsletterSubscriberRow[]> {
  let q = db
    .select({
      ...getTableColumns(newsletterSubscribers),
      suppressionReason: emailSuppressions.reason,
    })
    .from(newsletterSubscribers)
    .leftJoin(
      emailSuppressions,
      eq(emailSuppressions.email, sql<string>`lower(${newsletterSubscribers.email})`),
    )
    .$dynamic();

  if (opts?.status) {
    q = q.where(eq(newsletterSubscribers.status, opts.status));
  }
  if (opts?.consent === 'marketing') {
    q = q.where(eq(newsletterSubscribers.consentMarketing, true));
  }

  return q.orderBy(desc(newsletterSubscribers.subscribedAt));
}

export async function getNewsletterStats(): Promise<{
  total: number;
  totalMarketing: number;
  last30: number;
  suppressed: number;
}> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);

  const [[totals], [suppressionTotals]] = await Promise.all([
    db
      .select({
        total:          count(),
        totalMarketing: sql<number>`SUM(CASE WHEN ${newsletterSubscribers.consentMarketing} THEN 1 ELSE 0 END)::int`,
        last30:         sql<number>`SUM(CASE WHEN ${newsletterSubscribers.subscribedAt} >= ${thirtyDaysAgo.toISOString()} THEN 1 ELSE 0 END)::int`,
      })
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.status, 'active')),
    db
      .select({ suppressed: count() })
      .from(newsletterSubscribers)
      .innerJoin(
        emailSuppressions,
        eq(emailSuppressions.email, sql<string>`lower(${newsletterSubscribers.email})`),
      ),
  ]);

  return {
    total:          totals?.total          ?? 0,
    totalMarketing: totals?.totalMarketing ?? 0,
    last30:         totals?.last30         ?? 0,
    suppressed:     suppressionTotals?.suppressed ?? 0,
  };
}
