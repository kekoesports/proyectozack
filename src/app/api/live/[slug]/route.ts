import { NextResponse } from 'next/server';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { talents, talentLiveStatus, talentSocials } from '@/db/schema';

export const dynamic = 'force-dynamic';

export type TalentLiveData = {
  isLive: boolean;
  platform: string | null;
  streamTitle: string | null;
  gameName: string | null;
  viewerCount: number | null;
  thumbnailUrl: string | null;
  streamUrl: string | null;
  liveVideoId: string | null;
  handle: string | null;       // Twitch/YouTube handle
  profileUrl: string | null;   // enlace al canal
  lastCheckedAt: Date | null;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;

  const [row] = await db
    .select({
      isLive:         talentLiveStatus.isLive,
      platform:       talentLiveStatus.platform,
      streamTitle:    talentLiveStatus.streamTitle,
      gameName:       talentLiveStatus.gameName,
      viewerCount:    talentLiveStatus.viewerCount,
      thumbnailUrl:   talentLiveStatus.thumbnailUrl,
      streamUrl:      talentLiveStatus.streamUrl,
      liveVideoId:    talentLiveStatus.liveVideoId,
      lastCheckedAt:  talentLiveStatus.lastCheckedAt,
      handle:         talentSocials.handle,
      profileUrl:     talentSocials.profileUrl,
    })
    .from(talents)
    .leftJoin(talentLiveStatus, eq(talentLiveStatus.talentId, talents.id))
    .leftJoin(
      talentSocials,
      and(
        eq(talentSocials.talentId, talents.id),
        // joinear con el social de la plataforma que está live, o la principal del talento
        eq(talentSocials.platform, 'twitch'),
      ),
    )
    .where(and(eq(talents.slug, slug), isNull(talents.archivedAt)))
    .limit(1);

  if (!row) {
    return NextResponse.json({ isLive: false, handle: null, profileUrl: null }, { status: 404 });
  }

  const STALE_MS = 10 * 60 * 1000; // 10 min — igual que getLiveTalents
  const isStale = row.lastCheckedAt
    ? Date.now() - new Date(row.lastCheckedAt).getTime() > STALE_MS
    : true;

  const data: TalentLiveData = {
    isLive:        isStale ? false : (row.isLive ?? false),
    platform:      row.platform,
    streamTitle:   row.streamTitle,
    gameName:      row.gameName,
    viewerCount:   row.viewerCount,
    thumbnailUrl:  row.thumbnailUrl,
    streamUrl:     row.streamUrl,
    liveVideoId:   row.liveVideoId,
    handle:        row.handle,
    profileUrl:    row.profileUrl,
    lastCheckedAt: row.lastCheckedAt,
  };

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  });
}
