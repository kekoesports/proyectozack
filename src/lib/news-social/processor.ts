import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { newsSocialChannels, newsSocialDeliveries } from '@/db/schema';
import type { NewsSocialChannel } from '@/lib/schemas/news-social';
import { beginSocialPublish, claimSocialDelivery, enqueueSocialNews, pauseSocialChannel } from './repository';
import { NEWS_SOCIAL_ORIGIN } from './policy';
import { createInstagramStory, hasPublishingCredentials, instagramContainerStatus, publishInstagramStory, publishX,
  SocialProviderError, socialCredentialFingerprint } from './providers';

export async function processSocialChannel(channel: NewsSocialChannel, now = new Date()) {
  if (!env.NEWS_SOCIAL_ENABLED) return 'disabled';
  const [config] = await db.select().from(newsSocialChannels).where(eq(newsSocialChannels.channel, channel));
  if (!config?.enabled) return 'paused';
  if (!hasPublishingCredentials(channel) || config.credentialFingerprint !== socialCredentialFingerprint(channel)) {
    await pauseSocialChannel(channel, 'credentials_changed');
    return 'credentials_changed';
  }
  await db.update(newsSocialChannels).set({ lastRunAt: now }).where(eq(newsSocialChannels.channel, channel));
  await enqueueSocialNews(channel, now);
  const claim = await claimSocialDelivery(channel, now);
  if (!claim) return 'idle';
  const { delivery } = claim;
  const where = eq(newsSocialDeliveries.id, delivery.id);
  try {
    let containerId = delivery.containerId;
    if (channel === 'instagram') {
      if (!containerId) {
        containerId = await createInstagramStory(`${NEWS_SOCIAL_ORIGIN}/api/news/${delivery.postId}/story`);
        await db.update(newsSocialDeliveries).set({ containerId }).where(where);
      }
      const status = await instagramContainerStatus(containerId);
      if (status === 'IN_PROGRESS') {
        if (now.getTime() - delivery.createdAt.getTime() > 60 * 60 * 1000) throw new SocialProviderError('media_processing_expired');
        await db.update(newsSocialDeliveries).set({ status: 'pending', nextAttemptAt: new Date(now.getTime() + 60_000) }).where(where);
        return 'preparing';
      }
      if (status === 'PUBLISHED') {
        await db.update(newsSocialDeliveries).set({ status: 'published', publishedAt: now, lastError: null }).where(where);
        return 'published';
      }
      if (status !== 'FINISHED') throw new SocialProviderError('media_rejected');
    }
    if (!await beginSocialPublish(delivery.id, channel, socialCredentialFingerprint(channel), new Date())) return 'held';
    const remoteId = channel === 'x' ? await publishX(delivery.text) : await publishInstagramStory(containerId ?? '');
    await db.update(newsSocialDeliveries).set({ status: 'published', remoteId, publishedAt: new Date(), lastError: null }).where(where);
    return 'published';
  } catch (error) {
    // Unexpected persistence errors leave publishing in place for stale-claim quarantine.
    if (!(error instanceof SocialProviderError)) throw error;
    const canRetry = error.retryable && !error.uncertain && delivery.attempts < 3;
    await db.update(newsSocialDeliveries).set({
      status: error.uncertain ? 'uncertain' : canRetry ? 'pending' : 'blocked', lastError: error.code,
      nextAttemptAt: new Date(now.getTime() + 15 * 60_000),
      // Preparation errors also consume a retry slot, but never an X cost reservation.
      ...(channel === 'instagram' ? { attempts: delivery.attempts + 1 } : {}),
    }).where(where);
    if (['provider_http_401', 'provider_http_403', 'credentials_missing'].includes(error.code)) await pauseSocialChannel(channel, error.code);
    return error.uncertain ? 'uncertain' : 'failed';
  }
}
