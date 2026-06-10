import { and, eq, gt, isNull, or, desc, isNotNull, sql, count, max } from 'drizzle-orm';
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
          WHEN 'youtube' THEN 'youtube'
          ELSE 'twitch'
        END`,
      )
    )
    .where(
      and(
        eq(talents.visibility, 'public'),
        or(eq(talents.status, 'active'), eq(talents.status, 'available')),
        eq(talents.excludeFromLive, false),
        eq(talentLiveStatus.isLive, true),
        gt(talentLiveStatus.lastCheckedAt, tenMinutesAgo),
        isNull(talents.archivedAt),
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
      or(eq(talents.status, 'active'), eq(talents.status, 'available')),
      eq(talents.excludeFromLive, false),
      isNotNull(talentSocials.handle),
      isNull(talents.archivedAt),
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
      eq(talentSocials.platform, 'youtube'),
    ))
    .where(and(
      eq(talents.visibility, 'public'),
      or(eq(talents.status, 'active'), eq(talents.status, 'available')),
      eq(talents.excludeFromLive, false),
      isNotNull(talentSocials.platformId),
      isNull(talents.archivedAt),
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
 * Safety window de 10 min: si lastCheckedAt es viejo, isLive se fuerza a false.
 * Dedup por talentId: talentos con múltiples handles Twitch aparecen una sola vez
 * (el handle live tiene prioridad por el ORDER BY isLive DESC).
 */
export async function getTwitchRoster(): Promise<TwitchRosterEntry[]> {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

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
      lastCheckedAt:    talentLiveStatus.lastCheckedAt,
    })
    .from(talents)
    .innerJoin(talentSocials, and(
      eq(talentSocials.talentId, talents.id),
      eq(talentSocials.platform, 'twitch'),
    ))
    .leftJoin(talentLiveStatus, eq(talentLiveStatus.talentId, talents.id))
    .where(and(
      eq(talents.visibility, 'public'),
      or(eq(talents.status, 'active'), eq(talents.status, 'available')),
      eq(talents.excludeFromLive, false),
      isNotNull(talentSocials.handle),
      isNull(talents.archivedAt),
    ))
    .orderBy(
      desc(talentLiveStatus.isLive),
      desc(talentLiveStatus.startedAt),
      talents.name,
    );

  const seen = new Set<number>();
  return rows
    .filter((r) => {
      if (seen.has(r.talentId)) return false;
      seen.add(r.talentId);
      return true;
    })
    .map((r) => {
      const stale = !r.lastCheckedAt || r.lastCheckedAt < tenMinutesAgo;
      return {
        talentId:         r.talentId,
        slug:             r.slug,
        name:             r.name,
        photoUrl:         r.photoUrl,
        game:             r.game ?? '',
        featuredFallback: r.featuredFallback ?? false,
        handle:           r.handle,
        isLive:           stale ? false : (r.isLive ?? false),
        viewerCount:      stale ? null : r.viewerCount,
        gameName:         stale ? null : r.gameName,
        streamUrl:        stale ? null : r.streamUrl,
        startedAt:        r.startedAt,
      };
    });
}

/** Timestamp del último poll de Twitch exitoso, o null si nunca se ha hecho. */
export async function getLastTwitchCheck(): Promise<Date | null> {
  const result = await db
    .select({ ts: max(talentLiveStatus.lastCheckedAt) })
    .from(talentLiveStatus);
  return result[0]?.ts ?? null;
}

export type Cs2SidebarEntry = {
  talentId: number;
  slug: string;
  name: string;
  photoUrl: string | null;
  handle: string;
  game: string;
  role: string;
  /** ISO-3166-1 alpha-2 (ES, AR, MX, CL, CO, PE) o null si no asignado. */
  country: string | null;
  isLive: boolean;
  viewerCount: number | null;
  streamTitle: string | null;
  streamUrl: string | null;
  startedAt: Date | null;
  /** null si el cron nunca actualizó este talent. Para detectar stale en UI. */
  lastCheckedAt: Date | null;
};

/**
 * Roster CS2 enriquecido con estado live para sidebar editorial.
 * Filtra a talents cuyo `game` contiene CS2 / Counter-Strike y tienen
 * Twitch handle. Aplica la misma safety window de 10 min que
 * `getLiveTalents()` para evitar mostrar "live" si el cron lleva
 * inactivo. Ordena: live primero (mayor viewers), después offline por
 * nombre.
 *
 * No usa LIMIT en SQL — lo aplica el caller para mantener flexibilidad.
 */
export async function getCs2RosterForSidebar(): Promise<Cs2SidebarEntry[]> {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const rows = await db
    .select({
      talentId:    talents.id,
      slug:        talents.slug,
      name:        talents.name,
      photoUrl:    talents.photoUrl,
      handle:      talentSocials.handle,
      game:        talents.game,
      role:        talents.role,
      country:     talents.creatorCountry,
      isLive:      talentLiveStatus.isLive,
      viewerCount: talentLiveStatus.viewerCount,
      streamTitle: talentLiveStatus.streamTitle,
      streamUrl:   talentLiveStatus.streamUrl,
      startedAt:   talentLiveStatus.startedAt,
      lastChecked: talentLiveStatus.lastCheckedAt,
    })
    .from(talents)
    .innerJoin(
      talentSocials,
      and(eq(talentSocials.talentId, talents.id), eq(talentSocials.platform, 'twitch')),
    )
    .leftJoin(talentLiveStatus, eq(talentLiveStatus.talentId, talents.id))
    .where(
      and(
        eq(talents.visibility, 'public'),
        eq(talents.status, 'active'),
        eq(talents.excludeFromLive, false),
        isNotNull(talentSocials.handle),
        isNull(talents.archivedAt),
        sql`(${talents.game} ILIKE '%cs2%' OR ${talents.game} ILIKE '%counter%' OR ${talents.featuredLive} = true)`,
      ),
    )
    .orderBy(
      desc(talentLiveStatus.isLive),
      desc(talentLiveStatus.viewerCount),
      talents.name,
    );

  // Safety window: si lastChecked es viejo, descarta el flag isLive y
  // datos derivados. lastCheckedAt se preserva tal cual para que la UI
  // pueda detectar staleness y mostrar mensaje contextual.
  return rows.map((r) => {
    const stale = !r.lastChecked || r.lastChecked < tenMinutesAgo;
    return {
      talentId:      r.talentId,
      slug:          r.slug,
      name:          r.name,
      photoUrl:      r.photoUrl,
      handle:        r.handle,
      game:          r.game,
      role:          r.role,
      country:       r.country,
      isLive:        stale ? false : Boolean(r.isLive),
      viewerCount:   stale ? null : r.viewerCount,
      streamTitle:   stale ? null : r.streamTitle,
      streamUrl:     stale ? null : r.streamUrl,
      startedAt:     stale ? null : r.startedAt,
      lastCheckedAt: r.lastChecked,
    };
  });
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

export async function getTalentLiveStatus(talentId: number) {
  const rows = await db
    .select()
    .from(talentLiveStatus)
    .where(eq(talentLiveStatus.talentId, talentId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getFeaturedFallbackCount(): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(talents)
    .where(and(eq(talents.featuredFallback, true), isNull(talents.archivedAt)));
  return row?.total ?? 0;
}
