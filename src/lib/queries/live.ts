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
  liveVideoId: string | null;
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
      liveVideoId:  talentLiveStatus.liveVideoId,
      handle:       talentSocials.handle,
      startedAt:    talentLiveStatus.startedAt,
    })
    .from(talents)
    .innerJoin(talentLiveStatus, eq(talentLiveStatus.talentId, talents.id))
    .innerJoin(
      talentSocials,
      and(
        eq(talentSocials.talentId, talents.id),
        // Joinear con el social de la misma plataforma que está live
        sql`${talentSocials.platform} = CASE ${talentLiveStatus.platform}
          WHEN 'youtube' THEN 'yt'
          ELSE 'twitch'
        END`,
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

/** Para el poll: talentos públicos activos con social de Twitch */
export async function getTalentsWithTwitch() {
  return db
    .select({ talentId: talents.id, handle: talentSocials.handle })
    .from(talents)
    .innerJoin(talentSocials, and(
      eq(talentSocials.talentId, talents.id),
      eq(talentSocials.platform, 'twitch'),
    ))
    .where(and(
      eq(talents.visibility, 'public'),
      eq(talents.status, 'active'),
      eq(talents.excludeFromLive, false),
      isNotNull(talentSocials.handle),
    ));
}

/** Para el poll: talentos públicos activos con social de YouTube */
export async function getTalentsWithYouTube() {
  return db
    .select({
      talentId:  talents.id,
      handle:    talentSocials.handle,
      channelId: talentSocials.platformId, // YouTube channel ID (UCxxxxx)
    })
    .from(talents)
    .innerJoin(talentSocials, and(
      eq(talentSocials.talentId, talents.id),
      eq(talentSocials.platform, 'yt'),
    ))
    .where(and(
      eq(talents.visibility, 'public'),
      eq(talents.status, 'active'),
      eq(talents.excludeFromLive, false),
      isNotNull(talentSocials.platformId),
    ));
}

export type TwitchRosterEntry = {
  talentId: number;
  slug: string;
  name: string;
  photoUrl: string | null;
  handle: string;
  game: string;
  featuredFallback: boolean;
  isLive: boolean;
  viewerCount: number | null;
  gameName: string | null;
  streamUrl: string | null;
  startedAt: Date | null;
};

/**
 * Todos los talentos con Twitch configurado, live + offline.
 * Ordenados por: live primero, luego última vez en directo (startedAt DESC).
 * Para poblar la columna derecha de la sección live.
 */
export async function getTwitchRoster(): Promise<TwitchRosterEntry[]> {
  const rows = await db
    .select({
      talentId:         talents.id,
      slug:             talents.slug,
      name:             talents.name,
      photoUrl:         talents.photoUrl,
      game:             talents.game,
      featuredFallback: talents.featuredFallback,
      handle:           talentSocials.handle,
      isLive:           talentLiveStatus.isLive,
      viewerCount:      talentLiveStatus.viewerCount,
      gameName:         talentLiveStatus.gameName,
      streamUrl:        talentLiveStatus.streamUrl,
      startedAt:        talentLiveStatus.startedAt,
    })
    .from(talents)
    .innerJoin(talentSocials, and(
      eq(talentSocials.talentId, talents.id),
      eq(talentSocials.platform, 'twitch'),
    ))
    .leftJoin(talentLiveStatus, eq(talentLiveStatus.talentId, talents.id))
    .where(and(
      eq(talents.visibility, 'public'),
      eq(talents.status, 'active'),
      eq(talents.excludeFromLive, false),
      isNotNull(talentSocials.handle),
    ))
    .orderBy(
      desc(talentLiveStatus.isLive),
      desc(talentLiveStatus.startedAt),
      talents.name,
    );

  return rows.map((r) => ({ ...r, isLive: r.isLive ?? false, featuredFallback: r.featuredFallback ?? false }));
}

/** Para la página CRM /admin/live — todos los talentos con estado live */
export async function getAllTalentsLiveStatus() {
  return db
    .select({
      id:               talents.id,
      name:             talents.name,
      slug:             talents.slug,
      photoUrl:         talents.photoUrl,
      featuredLive:     talents.featuredLive,
      excludeFromLive:  talents.excludeFromLive,
      featuredFallback: talents.featuredFallback,
      isLive:           talentLiveStatus.isLive,
      platform:        talentLiveStatus.platform,
      gameName:        talentLiveStatus.gameName,
      viewerCount:     talentLiveStatus.viewerCount,
      streamTitle:     talentLiveStatus.streamTitle,
      lastCheckedAt:   talentLiveStatus.lastCheckedAt,
    })
    .from(talents)
    .leftJoin(talentLiveStatus, eq(talentLiveStatus.talentId, talents.id))
    .where(eq(talents.visibility, 'public'))
    .orderBy(desc(talentLiveStatus.isLive), desc(talentLiveStatus.viewerCount), talents.name);
}
