import { and, asc, desc, eq, gte, inArray, lt, lte, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { newsSocialChannels, newsSocialDeliveries, posts } from '@/db/schema';
import { webEditorialCondition } from '@/lib/queries/content-channel';
import type { NewsSocialChannel } from '@/lib/schemas/news-social';
import { budgetMonth, composeNewsPost, isEligibleNews, NEWS_MAX_AGE_MS, X_LINK_COST_CENTS, X_MONTHLY_BUDGET_CENTS } from './policy';

export async function ensureSocialChannels() {
  await db.insert(newsSocialChannels).values([{ channel: 'x' }, { channel: 'instagram' }]).onConflictDoNothing();
}

export async function getSocialOverview() {
  const [channels, deliveries] = await Promise.all([
    db.select().from(newsSocialChannels),
    db.select({ delivery: newsSocialDeliveries, title: posts.title }).from(newsSocialDeliveries)
      .leftJoin(posts, eq(posts.id, newsSocialDeliveries.postId)).orderBy(desc(newsSocialDeliveries.createdAt)).limit(60),
  ]);
  return { channels, deliveries };
}

export async function enqueueSocialNews(channel: NewsSocialChannel, now: Date) {
  const [config] = await db.select().from(newsSocialChannels).where(eq(newsSocialChannels.channel, channel));
  if (!config?.enabled || !config.startAt) return;
  const after = new Date(Math.max(config.startAt.getTime(), now.getTime() - NEWS_MAX_AGE_MS));
  const candidates = await db.select().from(posts).where(and(webEditorialCondition,
    eq(posts.status, 'published'), eq(posts.vertical, 'news'), gte(posts.publishedAt, after), lte(posts.publishedAt, now)));
  if (candidates.length) await db.insert(newsSocialDeliveries).values(candidates.map(post => ({
    postId: post.id, channel, ...composeNewsPost(post), nextAttemptAt: now,
  }))).onConflictDoNothing();
}

export async function claimSocialDelivery(channel: NewsSocialChannel, now: Date) {
  return db.transaction(async tx => {
    // Serialize claims/budget and activation/pause for this channel across processes.
    const [config] = await tx.select().from(newsSocialChannels).where(eq(newsSocialChannels.channel, channel)).for('update');
    if (!config?.enabled || !config.startAt) return null;
    const cutoff = new Date(now.getTime() - 10 * 60 * 1000);
    // Never automatically replay a request whose public side effect may have happened.
    await tx.update(newsSocialDeliveries).set({ status: 'uncertain', lastError: 'interrupted_publish' })
      .where(and(eq(newsSocialDeliveries.channel, channel), eq(newsSocialDeliveries.status, 'publishing'), lt(newsSocialDeliveries.claimedAt, cutoff)));
    await tx.update(newsSocialDeliveries).set({ status: 'pending', lastError: 'interrupted_prepare' })
      .where(and(eq(newsSocialDeliveries.channel, channel), eq(newsSocialDeliveries.status, 'processing'), lt(newsSocialDeliveries.claimedAt, cutoff)));
    const [row] = await tx.select().from(newsSocialDeliveries).where(and(eq(newsSocialDeliveries.channel, channel),
      eq(newsSocialDeliveries.status, 'pending'), lte(newsSocialDeliveries.nextAttemptAt, now)))
      .orderBy(asc(newsSocialDeliveries.id)).limit(1).for('update');
    if (!row) return null;
    const [post] = row.postId ? await tx.select().from(posts).where(eq(posts.id, row.postId)) : [];
    if (!post || !isEligibleNews(post, config.startAt, now)) {
      await tx.update(newsSocialDeliveries).set({ status: 'cancelled', lastError: 'article_no_longer_eligible' }).where(eq(newsSocialDeliveries.id, row.id));
      return null;
    }
    const copy = composeNewsPost(post);
    const [claimed] = await tx.update(newsSocialDeliveries).set({ ...copy, status: 'processing', claimedAt: now })
      .where(eq(newsSocialDeliveries.id, row.id)).returning();
    return claimed ? { delivery: claimed, config, post } : null;
  });
}

export async function beginSocialPublish(id: number, channel: NewsSocialChannel, fingerprint: string, now: Date): Promise<boolean> {
  return db.transaction(async tx => {
    const [config] = await tx.select().from(newsSocialChannels).where(eq(newsSocialChannels.channel, channel)).for('update');
    const [row] = await tx.select().from(newsSocialDeliveries).where(eq(newsSocialDeliveries.id, id)).for('update');
    if (!row || row.status !== 'processing' || row.channel !== channel) return false;
    if (!config?.enabled || config.credentialFingerprint !== fingerprint || !config.startAt) {
      await tx.update(newsSocialDeliveries).set({ status: 'pending', lastError: 'channel_paused' }).where(eq(newsSocialDeliveries.id, id));
      return false;
    }
    const [post] = row.postId ? await tx.select().from(posts).where(eq(posts.id, row.postId)) : [];
    if (!post || !isEligibleNews(post, config.startAt, now)) {
      await tx.update(newsSocialDeliveries).set({ status: 'cancelled', lastError: 'article_no_longer_eligible' }).where(eq(newsSocialDeliveries.id, id));
      return false;
    }
    if (channel === 'x') {
      const month = budgetMonth(now);
      const reserved = config.budgetMonth === month ? config.reservedCents : 0;
      if (reserved + X_LINK_COST_CENTS > X_MONTHLY_BUDGET_CENTS) {
        await tx.update(newsSocialDeliveries).set({ status: 'blocked', lastError: 'monthly_budget_reached' }).where(eq(newsSocialDeliveries.id, id));
        return false;
      }
      await tx.update(newsSocialChannels).set({ budgetMonth: month, reservedCents: reserved + X_LINK_COST_CENTS }).where(eq(newsSocialChannels.channel, channel));
    }
    // Commit BEFORE calling the provider: losing the ACK must never produce a duplicate.
    await tx.update(newsSocialDeliveries).set({ status: 'publishing', claimedAt: now, attempts: sql`${newsSocialDeliveries.attempts} + 1` })
      .where(eq(newsSocialDeliveries.id, id));
    return true;
  });
}

export async function pauseSocialChannel(channel: NewsSocialChannel, code: string | null = null) {
  await db.update(newsSocialChannels).set({ enabled: false, lastError: code }).where(eq(newsSocialChannels.channel, channel));
}

export async function activateSocialChannel(channel: NewsSocialChannel, accountId: string, fingerprint: string, now: Date) {
  await ensureSocialChannels();
  await db.transaction(async tx => {
    const [current] = await tx.select().from(newsSocialChannels).where(eq(newsSocialChannels.channel, channel)).for('update');
    await tx.update(newsSocialChannels).set({ enabled: true, accountId, credentialFingerprint: fingerprint, verifiedAt: now,
      startAt: current?.startAt ?? now, lastError: null }).where(eq(newsSocialChannels.channel, channel));
    // Only definite rejections can be retried. Unknown outcomes require independent reconciliation.
    await tx.update(newsSocialDeliveries).set({ status: 'pending', nextAttemptAt: now, lastError: null })
      .where(and(eq(newsSocialDeliveries.channel, channel), eq(newsSocialDeliveries.status, 'blocked'),
        inArray(newsSocialDeliveries.lastError, ['credentials_missing', 'provider_http_401', 'provider_http_403', 'credentials_changed'])));
  });
}
