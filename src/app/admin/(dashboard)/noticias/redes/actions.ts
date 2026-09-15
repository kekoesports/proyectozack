'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth-guard';
import { env } from '@/lib/env';
import { newsSocialChannels } from '@/db/schema';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { NewsSocialControl } from '@/lib/schemas/news-social';
import { activateSocialChannel, ensureSocialChannels, pauseSocialChannel } from '@/lib/news-social/repository';
import { hasPublishingCredentials, SocialProviderError, socialCredentialFingerprint, verifySocialIdentity } from '@/lib/news-social/providers';

export async function controlNewsSocialAction(formData: FormData): Promise<void> {
  await requireRole('admin', '/admin/login');
  const parsed = NewsSocialControl.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { channel, action } = parsed.data;
  await ensureSocialChannels();
  if (action === 'pause') {
    await pauseSocialChannel(channel);
  } else {
    try {
      if (!env.NEWS_SOCIAL_ENABLED) throw new SocialProviderError('service_disabled');
      if (!hasPublishingCredentials(channel)) throw new SocialProviderError('credentials_missing');
      const accountId = await verifySocialIdentity(channel);
      await activateSocialChannel(channel, accountId, socialCredentialFingerprint(channel), new Date());
    } catch (error) {
      const code = error instanceof SocialProviderError ? error.code : 'verification_failed';
      await db.update(newsSocialChannels).set({ enabled: false, lastError: code }).where(eq(newsSocialChannels.channel, channel));
    }
  }
  revalidatePath('/admin/noticias/redes');
}
