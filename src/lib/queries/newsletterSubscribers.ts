import { db } from '@/lib/db';
import { newsletterSubscribers } from '@/db/schema';
import { desc, eq, count, sql } from 'drizzle-orm';
import type { NewsletterSubscriber } from '@/db/schema/newsletterSubscribers';

export type { NewsletterSubscriber };

export async function listNewsletterSubscribers(opts?: {
  status?: 'active' | 'unsubscribed';
  consent?: 'newsletter' | 'marketing';
}): Promise<NewsletterSubscriber[]> {
  let q = db.select().from(newsletterSubscribers).$dynamic();

  if (opts?.status) {
    q = q.where(eq(newsletterSubscribers.status, opts.status));
  }
  if (opts?.consent === 'marketing') {
    q = q.where(eq(newsletterSubscribers.consentMarketing, true));
  }

  return q.orderBy(desc(newsletterSubscribers.subscribedAt));
}

export async function getNewsletterStats() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);

  const [totals] = await db
    .select({
      total:          count(),
      totalMarketing: sql<number>`SUM(CASE WHEN ${newsletterSubscribers.consentMarketing} THEN 1 ELSE 0 END)::int`,
      last30:         sql<number>`SUM(CASE WHEN ${newsletterSubscribers.subscribedAt} >= ${thirtyDaysAgo.toISOString()} THEN 1 ELSE 0 END)::int`,
    })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.status, 'active'));

  return {
    total:          totals?.total          ?? 0,
    totalMarketing: totals?.totalMarketing ?? 0,
    last30:         totals?.last30         ?? 0,
  };
}
