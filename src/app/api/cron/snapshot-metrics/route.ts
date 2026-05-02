import { NextRequest, NextResponse } from 'next/server';
import { fetchYouTubeSubscriberCounts } from '@/lib/services/youtube';
import { fetchTwitchFollowerCounts } from '@/lib/services/twitch';
import { getTrackableSocials, insertSnapshot } from '@/lib/queries/analytics';
import { assertCronAuth } from '@/lib/security/assertCronAuth';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authError = assertCronAuth(req);
  if (authError) return authError;

  const hasYouTube = !!env.YOUTUBE_API_KEY;
  const hasTwitch = !!env.TWITCH_CLIENT_ID && !!env.TWITCH_CLIENT_SECRET;

  if (!hasYouTube && !hasTwitch) {
    return NextResponse.json(
      { error: 'No API keys configured. Set YOUTUBE_API_KEY and/or TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET.' },
      { status: 500 },
    );
  }

  const today = new Date().toISOString().split('T')[0]!; // YYYY-MM-DD
  const socials = await getTrackableSocials();
  const errors: string[] = [];
  let youtubeCount = 0;
  let twitchCount = 0;

  // YouTube batch
  if (hasYouTube) {
    const ytSocials = socials.filter((s) => s.platform === 'youtube');
    if (ytSocials.length > 0) {
      try {
        const channelIds = ytSocials.map((s) => s.platformId);
        const stats = await fetchYouTubeSubscriberCounts(channelIds);

        // Map channelId back to talentId
        const channelToTalent = new Map(ytSocials.map((s) => [s.platformId, s.talentId]));

        for (const stat of stats) {
          const talentId = channelToTalent.get(stat.channelId);
          if (talentId !== undefined) {
            await insertSnapshot({
              talentId,
              platform: 'youtube',
              metricType: 'subscribers',
              value: stat.subscriberCount,
              snapshotDate: today,
            });
            youtubeCount++;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown YouTube error';
        errors.push(`YouTube: ${msg}`);
        console.error('YouTube API error:', msg);
      }
    }
  }

  // Twitch batch
  if (hasTwitch) {
    const twitchSocials = socials.filter((s) => s.platform === 'twitch');
    if (twitchSocials.length > 0) {
      try {
        const broadcasterIds = twitchSocials.map((s) => s.platformId);
        const stats = await fetchTwitchFollowerCounts(broadcasterIds);

        // Map broadcasterId back to talentId
        const idToTalent = new Map(twitchSocials.map((s) => [s.platformId, s.talentId]));

        for (const stat of stats) {
          const talentId = idToTalent.get(stat.broadcasterId);
          if (talentId !== undefined) {
            await insertSnapshot({
              talentId,
              platform: 'twitch',
              metricType: 'followers',
              value: stat.followerCount,
              snapshotDate: today,
            });
            twitchCount++;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown Twitch error';
        errors.push(`Twitch: ${msg}`);
        console.error('Twitch API error:', msg);
      }
    }
  }

  return NextResponse.json({
    success: errors.length === 0,
    youtube: youtubeCount,
    twitch: twitchCount,
    errors,
    date: today,
  });
}
