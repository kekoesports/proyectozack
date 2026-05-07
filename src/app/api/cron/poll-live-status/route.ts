import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { assertCronAuth } from '@/lib/security/assertCronAuth';
import { fetchTwitchLiveByLogins } from '@/lib/services/twitch';
import { getTalentsWithTwitch } from '@/lib/queries/live';
import { db } from '@/lib/db';
import { talentLiveStatus } from '@/db/schema';

export const dynamic = 'force-dynamic';

/** Reemplaza {width}x{height} en thumbnail_url de Twitch */
function resolveThumbnail(url: string, w = 640, h = 360): string {
  return url.replace('{width}', String(w)).replace('{height}', String(h));
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authError = assertCronAuth(req);
  if (authError) return authError;

  const now = new Date();

  // 1. Leer todos los talentos con Twitch configurado
  const talentsWithTwitch = await getTalentsWithTwitch();
  if (talentsWithTwitch.length === 0) {
    return NextResponse.json({ ok: true, live: 0, checked: 0, message: 'No talents with Twitch configured' });
  }

  // 2. Llamar Twitch API — si falla, NO tocar la DB (evita falsos offline)
  let liveStreams;
  try {
    const handles = talentsWithTwitch.map((t) => t.handle);
    liveStreams = await fetchTwitchLiveByLogins(handles);
  } catch (err) {
    console.error('[poll-live] Twitch API error — skipping DB update:', err);
    return NextResponse.json(
      { ok: false, skipped: true, reason: 'Twitch API unavailable' },
      { status: 200 }, // 200 para que Vercel no marque el cron como fallido
    );
  }

  // 3. Construir mapa login→stream para lookup O(1)
  const liveMap = new Map(liveStreams.map((s) => [s.userLogin.toLowerCase(), s]));

  // 4. Upsert para cada talento
  const upserts = talentsWithTwitch.map((talent) => {
    const stream = liveMap.get(talent.handle.toLowerCase());
    if (stream) {
      return db
        .insert(talentLiveStatus)
        .values({
          talentId:      talent.talentId,
          isLive:        true,
          platform:      'twitch',
          streamTitle:   stream.title,
          gameName:      stream.gameName,
          viewerCount:   stream.viewerCount,
          thumbnailUrl:  resolveThumbnail(stream.thumbnailUrl),
          streamUrl:     `https://www.twitch.tv/${stream.userLogin}`,
          startedAt:     stream.startedAt,
          lastCheckedAt: now,
        })
        .onConflictDoUpdate({
          target: talentLiveStatus.talentId,
          set: {
            isLive:        true,
            platform:      'twitch',
            streamTitle:   stream.title,
            gameName:      stream.gameName,
            viewerCount:   stream.viewerCount,
            thumbnailUrl:  resolveThumbnail(stream.thumbnailUrl),
            streamUrl:     `https://www.twitch.tv/${stream.userLogin}`,
            startedAt:     stream.startedAt,
            lastCheckedAt: now,
          },
        });
    } else {
      return db
        .insert(talentLiveStatus)
        .values({
          talentId:      talent.talentId,
          isLive:        false,
          platform:      null,
          streamTitle:   null,
          gameName:      null,
          viewerCount:   null,
          thumbnailUrl:  null,
          streamUrl:     null,
          startedAt:     null,
          lastCheckedAt: now,
        })
        .onConflictDoUpdate({
          target: talentLiveStatus.talentId,
          set: {
            isLive:        false,
            streamTitle:   null,
            gameName:      null,
            viewerCount:   null,
            thumbnailUrl:  null,
            streamUrl:     null,
            startedAt:     null,
            lastCheckedAt: now,
          },
        });
    }
  });

  await Promise.all(upserts);

  console.log(`[poll-live] checked=${talentsWithTwitch.length} live=${liveStreams.length}`);
  return NextResponse.json({
    ok: true,
    checked: talentsWithTwitch.length,
    live: liveStreams.length,
    liveHandles: liveStreams.map((s) => s.userLogin),
  });
}
