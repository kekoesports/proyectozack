import { NextResponse, after } from 'next/server';
import { desc } from 'drizzle-orm';
import { getLiveTalents, pickFeatured, getTalentsWithTwitch, getTalentsWithYouTube, getTwitchRoster } from '@/lib/queries/live';
import { fetchTwitchLiveByLogins } from '@/lib/services/twitch';
import { fetchYouTubeLive } from '@/lib/services/youtube';
import { env } from '@/lib/env';
import { db } from '@/lib/db';
import { talentLiveStatus } from '@/db/schema';

export const dynamic = 'force-dynamic';

const STALE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutos

function resolveThumbnail(url: string, w = 640, h = 360): string {
  return url.replace('{width}', String(w)).replace('{height}', String(h));
}

async function pollTwitch(): Promise<void> {
  const talentsWithTwitch = await getTalentsWithTwitch();
  if (talentsWithTwitch.length === 0) return;

  let liveStreams;
  try {
    liveStreams = await fetchTwitchLiveByLogins(talentsWithTwitch.map((t) => t.handle));
  } catch (err) {
    console.error('[api/live] Twitch poll failed — keeping existing data:', err);
    return;
  }

  const liveMap = new Map(liveStreams.map((s) => [s.userLogin.toLowerCase(), s]));
  const now = new Date();

  await Promise.all(
    talentsWithTwitch.map((talent) => {
      const stream = liveMap.get(talent.handle.toLowerCase());
      return stream
        ? db.insert(talentLiveStatus).values({
            talentId: talent.talentId, isLive: true, platform: 'twitch',
            streamTitle: stream.title, gameName: stream.gameName,
            viewerCount: stream.viewerCount,
            thumbnailUrl: resolveThumbnail(stream.thumbnailUrl),
            streamUrl: `https://www.twitch.tv/${stream.userLogin}`,
            startedAt: stream.startedAt, lastCheckedAt: now,
          }).onConflictDoUpdate({
            target: talentLiveStatus.talentId,
            set: {
              isLive: true, platform: 'twitch',
              streamTitle: stream.title, gameName: stream.gameName,
              viewerCount: stream.viewerCount,
              thumbnailUrl: resolveThumbnail(stream.thumbnailUrl),
              streamUrl: `https://www.twitch.tv/${stream.userLogin}`,
              startedAt: stream.startedAt, lastCheckedAt: now,
            },
          })
        : db.insert(talentLiveStatus).values({
            talentId: talent.talentId, isLive: false, platform: null,
            streamTitle: null, gameName: null, viewerCount: null,
            thumbnailUrl: null, streamUrl: null,
            lastCheckedAt: now,
            // startedAt NO se borra — guarda cuándo fue su último directo
          }).onConflictDoUpdate({
            target: talentLiveStatus.talentId,
            set: { isLive: false, streamTitle: null, gameName: null,
              viewerCount: null, thumbnailUrl: null, streamUrl: null,
              lastCheckedAt: now },
            // startedAt se conserva (no está en el set)
          });
    })
  );
}

async function pollYouTube(): Promise<void> {
  if (!env.YOUTUBE_API_KEY) return;
  const talentsWithYT = await getTalentsWithYouTube();
  if (talentsWithYT.length === 0) return;

  const validTalents = talentsWithYT.filter((t): t is typeof t & { channelId: string } =>
    t.channelId !== null
  );
  if (validTalents.length === 0) return;

  let liveResults;
  try {
    liveResults = await fetchYouTubeLive(validTalents.map((t) => t.channelId));
  } catch (err) {
    console.error('[api/live] YouTube poll failed — keeping existing data:', err);
    return;
  }

  const liveMap = new Map(liveResults.map((r) => [r.channelId, r]));
  const now = new Date();

  await Promise.all(
    validTalents.map((talent) => {
      const live = liveMap.get(talent.channelId);
      return live
        ? db.insert(talentLiveStatus).values({
            talentId: talent.talentId, isLive: true, platform: 'youtube',
            streamTitle: live.title, gameName: null, viewerCount: null,
            thumbnailUrl: live.thumbnailUrl,
            streamUrl: `https://www.youtube.com/watch?v=${live.videoId}`,
            liveVideoId: live.videoId,
            startedAt: now, lastCheckedAt: now,
          }).onConflictDoUpdate({
            target: talentLiveStatus.talentId,
            set: {
              isLive: true, platform: 'youtube',
              streamTitle: live.title, gameName: null, viewerCount: null,
              thumbnailUrl: live.thumbnailUrl,
              streamUrl: `https://www.youtube.com/watch?v=${live.videoId}`,
              liveVideoId: live.videoId,
              startedAt: now, lastCheckedAt: now,
            },
          })
        : db.insert(talentLiveStatus).values({
            talentId: talent.talentId, isLive: false, platform: null,
            streamTitle: null, gameName: null, viewerCount: null,
            thumbnailUrl: null, streamUrl: null, liveVideoId: null,
            lastCheckedAt: now,
          }).onConflictDoUpdate({
            target: talentLiveStatus.talentId,
            set: { isLive: false, streamTitle: null, gameName: null,
              viewerCount: null, thumbnailUrl: null, streamUrl: null,
              liveVideoId: null, lastCheckedAt: now },
          });
    })
  );
}

export async function GET(): Promise<NextResponse> {
  // Comprobar antigüedad del último check
  const [latest] = await db
    .select({ lastCheckedAt: talentLiveStatus.lastCheckedAt })
    .from(talentLiveStatus)
    .orderBy(desc(talentLiveStatus.lastCheckedAt))
    .limit(1);

  const isStale =
    !latest?.lastCheckedAt ||
    Date.now() - latest.lastCheckedAt.getTime() > STALE_THRESHOLD_MS;

  // Si los datos son viejos, lanzar el poll DESPUÉS de enviar la respuesta
  // (next/server `after` ejecuta el callback tras finalizar el streaming)
  if (isStale) {
    after(async () => {
      await pollTwitch();
      await pollYouTube();
    });
  }

  const [lives, roster] = await Promise.all([
    getLiveTalents(),
    getTwitchRoster(),
  ]);
  const featured = pickFeatured(lives);
  const others = featured ? lives.filter((l) => l.talentId !== featured.talentId) : lives;

  return NextResponse.json(
    { featured, others, roster, total: lives.length, stale: isStale },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
  );
}
