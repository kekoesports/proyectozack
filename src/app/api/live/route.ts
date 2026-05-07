import { NextResponse, after } from 'next/server';
import { desc } from 'drizzle-orm';
import { getLiveTalents, pickFeatured, getTalentsWithTwitch } from '@/lib/queries/live';
import { fetchTwitchLiveByLogins } from '@/lib/services/twitch';
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
    return; // NO tocar DB si falla la API
  }

  const liveMap = new Map(liveStreams.map((s) => [s.userLogin.toLowerCase(), s]));
  const now = new Date();

  await Promise.all(
    talentsWithTwitch.map((talent) => {
      const stream = liveMap.get(talent.handle.toLowerCase());
      return stream
        ? db
            .insert(talentLiveStatus)
            .values({
              talentId: talent.talentId, isLive: true, platform: 'twitch',
              streamTitle: stream.title, gameName: stream.gameName,
              viewerCount: stream.viewerCount,
              thumbnailUrl: resolveThumbnail(stream.thumbnailUrl),
              streamUrl: `https://www.twitch.tv/${stream.userLogin}`,
              startedAt: stream.startedAt, lastCheckedAt: now,
            })
            .onConflictDoUpdate({
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
        : db
            .insert(talentLiveStatus)
            .values({
              talentId: talent.talentId, isLive: false, platform: null,
              streamTitle: null, gameName: null, viewerCount: null,
              thumbnailUrl: null, streamUrl: null, startedAt: null,
              lastCheckedAt: now,
            })
            .onConflictDoUpdate({
              target: talentLiveStatus.talentId,
              set: {
                isLive: false, streamTitle: null, gameName: null,
                viewerCount: null, thumbnailUrl: null, streamUrl: null,
                startedAt: null, lastCheckedAt: now,
              },
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
    after(pollTwitch);
  }

  const lives = await getLiveTalents();
  const featured = pickFeatured(lives);
  const others = featured ? lives.filter((l) => l.talentId !== featured.talentId) : lives;

  return NextResponse.json(
    { featured, others, total: lives.length, stale: isStale },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
  );
}
