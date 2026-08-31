import { NextRequest, NextResponse } from 'next/server';

import { env } from '@/lib/env';
import { getTrackableSocials, insertSnapshot } from '@/lib/queries/analytics';
import {
  upsertTalentChannelSnapshot,
  upsertTalentContentPerformance,
} from '@/lib/queries/talentIntelligence';
import { assertCronAuth } from '@/lib/security/assertCronAuth';
import { fetchTwitchFollowerCounts } from '@/lib/services/twitch';
import {
  getChannelDetails,
  getChannelRecentContent,
} from '@/lib/services/youtube';
import { createLimit } from '@/lib/utils/concurrencyLimit';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authError = assertCronAuth(req);
  if (authError) return authError;

  const hasYouTube = Boolean(env.YOUTUBE_API_KEY);
  const hasTwitch = Boolean(env.TWITCH_CLIENT_ID && env.TWITCH_CLIENT_SECRET);
  if (!hasYouTube && !hasTwitch) {
    return NextResponse.json({ error: 'No hay fuentes de métricas configuradas.' }, { status: 500 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const socials = await getTrackableSocials();
  const errors: string[] = [];
  let youtubeCount = 0;
  let twitchCount = 0;
  let contentCount = 0;

  if (hasYouTube) {
    const youtubeSocials = socials.filter((social) => social.platform === 'youtube');
    try {
      const details = await getChannelDetails(youtubeSocials.map((social) => social.platformId));
      const detailsById = new Map(details.map((detail) => [detail.channelId, detail]));
      const limit = createLimit(4);

      const channelResults = await Promise.allSettled(youtubeSocials.map((social) => limit(async () => {
        const detail = detailsById.get(social.platformId);
        if (!detail) {
          errors.push(`YouTube: canal ${social.socialId} no disponible`);
          return;
        }

        let content: Awaited<ReturnType<typeof getChannelRecentContent>> = [];
        try {
          content = await getChannelRecentContent(social.platformId, 365, 100);
        } catch {
          errors.push(`YouTube: contenido del canal ${social.socialId} no disponible`);
        }

        const cutoff30 = Date.now() - 30 * 86_400_000;
        const recent = content.filter((video) => video.publishedAt.getTime() >= cutoff30);
        const recentViews = recent.reduce((sum, video) => sum + video.views, 0);
        const interactions = recent.reduce(
          (sum, video) => sum + (video.likes ?? 0) + (video.comments ?? 0),
          0,
        );
        const engagement = recentViews > 0 ? (interactions / recentViews) * 100 : null;

        await Promise.all([
          insertSnapshot({
            talentId: social.talentId,
            platform: 'youtube',
            metricType: 'subscribers',
            value: detail.subscriberCount,
            snapshotDate: today,
          }),
          upsertTalentChannelSnapshot({
            talentId: social.talentId,
            socialId: social.socialId,
            platform: 'youtube',
            snapshotDate: today,
            followers: detail.subscriberCount,
            totalViews: detail.viewCount,
            contentCount: detail.videoCount,
            recentViews30d: recentViews,
            avgViews30d: recent.length > 0 ? Math.round(recentViews / recent.length) : 0,
            uploads30d: recent.length,
            engagementRate30d: engagement,
            dataSource: 'youtube_api',
          }),
          upsertTalentContentPerformance(content.map((video) => ({
            talentId: social.talentId,
            socialId: social.socialId,
            platform: 'youtube',
            externalContentId: video.videoId,
            title: video.title,
            contentUrl: video.url,
            thumbnailUrl: video.thumbnailUrl,
            publishedAt: video.publishedAt,
            viewCount: video.views,
            likeCount: video.likes,
            commentCount: video.comments,
          }))),
        ]);

        youtubeCount += 1;
        contentCount += content.length;
      })));

      channelResults.forEach((result, index) => {
        if (result.status !== 'rejected') return;
        const social = youtubeSocials[index];
        errors.push(`YouTube: sincronización del canal ${social?.socialId ?? 'desconocido'} no completada`);
      });
    } catch (error) {
      errors.push(`YouTube: ${safePlatformError(error)}`);
    }
  }

  if (hasTwitch) {
    const twitchSocials = socials.filter((social) => social.platform === 'twitch');
    try {
      const stats = await fetchTwitchFollowerCounts(twitchSocials.map((social) => social.platformId));
      const socialById = new Map(twitchSocials.map((social) => [social.platformId, social]));

      for (const stat of stats) {
        const social = socialById.get(stat.broadcasterId);
        if (!social) continue;
        await Promise.all([
          insertSnapshot({
            talentId: social.talentId,
            platform: 'twitch',
            metricType: 'followers',
            value: stat.followerCount,
            snapshotDate: today,
          }),
          upsertTalentChannelSnapshot({
            talentId: social.talentId,
            socialId: social.socialId,
            platform: 'twitch',
            snapshotDate: today,
            followers: stat.followerCount,
            dataSource: 'twitch_api',
          }),
        ]);
        twitchCount += 1;
      }
    } catch (error) {
      errors.push(`Twitch: ${safePlatformError(error)}`);
    }
  }

  console.info('[snapshot-metrics] completed', {
    youtubeChannels: youtubeCount,
    twitchChannels: twitchCount,
    contentRows: contentCount,
    errors: errors.length,
  });

  return NextResponse.json({
    success: errors.length === 0,
    date: today,
    youtube: { channels: youtubeCount, content: contentCount },
    twitch: { channels: twitchCount },
    errors,
  });
}

function safePlatformError(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('token error')) return 'credenciales rechazadas';
  if (message.includes('quota') || message.includes('403')) return 'cuota o permiso no disponible';
  return 'consulta no completada';
}
