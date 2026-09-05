import { and, eq, sql } from 'drizzle-orm';
import { creatorDailyApiUsage } from '@/db/schema';
import { db } from '@/lib/db';
import { creatorApiBudget } from '@/lib/targets/creator-api-budget';

export function createCreatorBudgetGuard(scopeKey: string, searchPagesPerDay: number): (urlWithoutQuery: string) => Promise<void> {
  if (!/^[a-zA-Z0-9:_-]{1,120}$/.test(scopeKey)) throw new Error('creator_budget_scope_invalid');
  return async (urlWithoutQuery) => {
    const budget = creatorApiBudget(urlWithoutQuery, searchPagesPerDay, new Date());
    await db.transaction(async (tx) => {
      await tx.execute(sql`set local statement_timeout = '20s'`);
      await tx.execute(sql`set local transaction_timeout = '25s'`);
      await tx.execute(sql`set local lock_timeout = '5s'`);
      // One global lock orders both reservations consistently, even across several profiles.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'creator-budget:' + budget.platform + ':' + budget.bucketDay}))`);
      for (const [budgetKey, limit] of [['global', budget.globalLimit], [`profile:${scopeKey}`, budget.profileLimit]] as const) {
        const where = and(eq(creatorDailyApiUsage.platform, budget.platform), eq(creatorDailyApiUsage.bucketDay, budget.bucketDay), eq(creatorDailyApiUsage.budgetKey, budgetKey));
        const [row] = await tx.select({ count: creatorDailyApiUsage.reservedRequests }).from(creatorDailyApiUsage).where(where);
        if ((row?.count ?? 0) >= limit) throw new Error('creator_daily_budget_exhausted');
        await tx.insert(creatorDailyApiUsage).values({ platform: budget.platform, bucketDay: budget.bucketDay, budgetKey, reservedRequests: 1 })
          .onConflictDoUpdate({ target: [creatorDailyApiUsage.platform, creatorDailyApiUsage.bucketDay, creatorDailyApiUsage.budgetKey],
            set: { reservedRequests: sql`${creatorDailyApiUsage.reservedRequests} + 1`, updatedAt: new Date() } });
      }
    });
  };
}
