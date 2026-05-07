import { and, eq, gt, desc, isNotNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { talents, talentSocials, talentLiveStatus } from '@/db/schema';

export type LiveTalent = {
  talentId: number;
  slug: string;
  name: string;
  photoUrl: string | null;
  platform: string | null;
  streamTitle: string | null;
  gameName: string | null;
  viewerCount: number | null;
  thumbnailUrl: string | null;
  streamUrl: string | null;
  handle: string;
  featuredLive: boolean;
  startedAt: Date | null;
};

/**
 * Devuelve los talentos actualmente en directo.
 * Filtra filas con lastCheckedAt > ahora - 10 min para evitar
 * mostrar "en directo" si el cron lleva horas sin funcionar.
 */
export async function getLiveTalents(): Promise<LiveTalent[]> {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const rows = await db
    .select({
      talentId:     talents.id,
      slug:         talents.slug,
      name:         talents.name,
      photoUrl:     talents.photoUrl,
      featuredLive: talents.featuredLive,
      platform:     talentLiveStatus.platform,
      streamTitle:  talentLiveStatus.streamTitle,
      gameName:     talentLiveStatus.gameName,
      viewerCount:  talentLiveStatus.viewerCount,
      thumbnailUrl: talentLiveStatus.thumbnailUrl,
      streamUrl:    talentLiveStatus.streamUrl,
      handle:       talentSocials.handle,
      startedAt:    talentLiveStatus.startedAt,
    })
    .from(talents)
    .innerJoin(talentLiveStatus, eq(talentLiveStatus.talentId, talents.id))
    .innerJoin(
      talentSocials,
      and(
        eq(talentSocials.talentId, talents.id),
        eq(talentSocials.platform, 'tw'),
      )
    )
    .where(
      and(
        eq(talents.visibility, 'public'),
        eq(talents.status, 'active'),
        eq(talents.excludeFromLive, false),
        eq(talentLiveStatus.isLive, true),
        gt(talentLiveStatus.lastCheckedAt, tenMinutesAgo),
      )
    )
    .orderBy(desc(talentLiveStatus.viewerCount));

  return rows;
}

/** Devuelve el streamer destacado siguiendo la lógica de prioridad:
 *  1. featuredLive=true + en directo (mayor viewers)
 *  2. En directo (mayor viewers)
 */
export function pickFeatured(lives: LiveTalent[]): LiveTalent | null {
  if (lives.length === 0) return null;
  const manual = lives.filter((l) => l.featuredLive);
  return manual[0] ?? lives[0] ?? null;
}

/** Para el cron: talentos públicos activos con social de Twitch */
export async function getTalentsWithTwitch() {
  return db
    .select({
      talentId: talents.id,
      handle:   talentSocials.handle,
    })
    .from(talents)
    .innerJoin(
      talentSocials,
      and(
        eq(talentSocials.talentId, talents.id),
        eq(talentSocials.platform, 'tw'),
      )
    )
    .where(
      and(
        eq(talents.visibility, 'public'),
        eq(talents.status, 'active'),
        eq(talents.excludeFromLive, false),
        isNotNull(talentSocials.handle),
      )
    );
}
