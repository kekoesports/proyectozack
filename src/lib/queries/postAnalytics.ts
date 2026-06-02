import { eq, and, gt, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { postEvents } from '@/db/schema/postEvents';
import { talentProfileEvents } from '@/db/schema/talentProfileEvents';
import { posts } from '@/db/schema/posts';
import { talents } from '@/db/schema/talents';
import { readTime } from '@/lib/utils/blog';

export type PostVertical = 'blog' | 'news';

export type PostTopViewRow = {
  postId:         number;
  slug:           string;
  title:          string;
  vertical:       PostVertical;
  tags:           string[];
  readMinutes:    number;
  totalViews:     number;
  views7d:        number;
  views30d:       number;
  uniqueVisitors: number;
};

export type PostViewsByDayRow = {
  day:      string;
  vertical: PostVertical;
  views:    number;
};

export type PostTopTagRow = {
  tag:   string;
  views: number;
};

export type PostAnalyticsDetail = {
  totalViews:     number;
  views7d:        number;
  views30d:       number;
  uniqueVisitors: number;
  byCountry:   { country: string | null; views: number }[];
  byDevice:    { device:  string | null; views: number }[];
  byReferrer:  { referrerHost: string | null; views: number }[];
};

export type TalentArticleViewRow = {
  talentId:      number;
  talentSlug:    string;
  talentName:    string;
  photoUrl:      string | null;
  articleViews:  number;
  articleCount:  number;
  profileViews:  number;
};

export type BrandViewRow = {
  brand:    string;
  views:    number;
  articles: number;
};

export type CountryViewRow = {
  country: string | null;
  views:   number;
  pct:     number;
};

export type MonthlyViewRow = {
  month:    string; // YYYY-MM
  views:    number;
  delta:    number | null; // % vs previous month, null on first row
};

// ── Helpers ───────────────────────────────────────────────────────────

const since = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

// ── Queries ──────────────────────────────────────────────────────────

/**
 * Ranking de posts por visitas totales, con desglose 7d / 30d y únicos estimados.
 * Devuelve solo posts que tienen al menos 1 evento de view.
 */
export async function getTopPostsByViews(
  vertical: PostVertical | 'all' = 'all',
  limit = 20,
): Promise<PostTopViewRow[]> {
  const rows = await db
    .select({
      postId:         posts.id,
      slug:           posts.slug,
      title:          posts.title,
      vertical:       posts.vertical,
      tags:           posts.tags,
      bodyMd:         posts.bodyMd,
      totalViews:     sql<number>`cast(count(*) as int)`,
      views7d:        sql<number>`cast(count(*) filter (where ${postEvents.createdAt} >= now() - interval '7 days') as int)`,
      views30d:       sql<number>`cast(count(*) filter (where ${postEvents.createdAt} >= now() - interval '30 days') as int)`,
      uniqueVisitors: sql<number>`cast(count(distinct ${postEvents.sessionHash}) as int)`,
    })
    .from(postEvents)
    .innerJoin(posts, eq(posts.id, postEvents.postId))
    .where(
      vertical !== 'all'
        ? and(eq(postEvents.action, 'view'), eq(posts.vertical, vertical))
        : eq(postEvents.action, 'view'),
    )
    .groupBy(posts.id, posts.slug, posts.title, posts.vertical, posts.tags, posts.bodyMd)
    .orderBy(sql`count(*) desc`)
    .limit(limit) as unknown as Array<PostTopViewRow & { bodyMd: string }>;

  return rows.map(({ bodyMd, ...rest }) => ({ ...rest, readMinutes: readTime(bodyMd) }));
}

/**
 * Visitas por día, desglosadas por vertical (blog | news).
 * Usada para el gráfico de evolución temporal.
 */
export async function getPostViewsByDay(days = 30): Promise<PostViewsByDayRow[]> {
  return db
    .select({
      day:      sql<string>`(${postEvents.createdAt} AT TIME ZONE 'UTC')::date::text`,
      vertical: posts.vertical,
      views:    sql<number>`cast(count(*) as int)`,
    })
    .from(postEvents)
    .innerJoin(posts, eq(posts.id, postEvents.postId))
    .where(and(eq(postEvents.action, 'view'), gt(postEvents.createdAt, since(days))))
    .groupBy(
      sql`(${postEvents.createdAt} AT TIME ZONE 'UTC')::date`,
      posts.vertical,
    )
    .orderBy(sql`(${postEvents.createdAt} AT TIME ZONE 'UTC')::date asc`) as unknown as Promise<PostViewsByDayRow[]>;
}

/**
 * Tags más vistos, calculados cruzando los tags de los posts con los eventos de view.
 * Usa LATERAL + jsonb_array_elements_text para unnest el array de tags en Postgres.
 */
export async function getTopTagsByViews(
  vertical: PostVertical | 'all' = 'all',
  days = 30,
): Promise<PostTopTagRow[]> {
  const since30 = since(days);
  const verticalFilter = vertical !== 'all'
    ? sql`AND p.vertical = ${vertical}`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      t.tag::text                AS tag,
      CAST(COUNT(*) AS INT)      AS views
    FROM post_events pe
    INNER JOIN posts p ON p.id = pe.post_id,
    LATERAL jsonb_array_elements_text(p.tags) AS t(tag)
    WHERE pe.action = 'view'
      AND pe.created_at >= ${since30}
      ${verticalFilter}
      AND jsonb_array_length(p.tags) > 0
    GROUP BY t.tag
    ORDER BY views DESC
    LIMIT 20
  `);

  return (result.rows as Array<{ tag: string; views: number }>).map((r) => ({
    tag:   r.tag,
    views: Number(r.views),
  }));
}

/**
 * Ficha de métricas de un artículo individual.
 */
export async function getPostAnalyticsDetail(postId: number): Promise<PostAnalyticsDetail> {
  const [totals] = await db
    .select({
      totalViews:     sql<number>`cast(count(*) as int)`,
      views7d:        sql<number>`cast(count(*) filter (where ${postEvents.createdAt} >= now() - interval '7 days') as int)`,
      views30d:       sql<number>`cast(count(*) filter (where ${postEvents.createdAt} >= now() - interval '30 days') as int)`,
      uniqueVisitors: sql<number>`cast(count(distinct ${postEvents.sessionHash}) as int)`,
    })
    .from(postEvents)
    .where(and(eq(postEvents.postId, postId), eq(postEvents.action, 'view')));

  const byCountry = await db
    .select({
      country: postEvents.country,
      views:   sql<number>`cast(count(*) as int)`,
    })
    .from(postEvents)
    .where(and(eq(postEvents.postId, postId), eq(postEvents.action, 'view')))
    .groupBy(postEvents.country)
    .orderBy(sql`count(*) desc`)
    .limit(10) as { country: string | null; views: number }[];

  const byDevice = await db
    .select({
      device: postEvents.device,
      views:  sql<number>`cast(count(*) as int)`,
    })
    .from(postEvents)
    .where(and(eq(postEvents.postId, postId), eq(postEvents.action, 'view')))
    .groupBy(postEvents.device)
    .orderBy(sql`count(*) desc`) as { device: string | null; views: number }[];

  const byReferrer = await db
    .select({
      referrerHost: postEvents.referrerHost,
      views:        sql<number>`cast(count(*) as int)`,
    })
    .from(postEvents)
    .where(and(eq(postEvents.postId, postId), eq(postEvents.action, 'view')))
    .groupBy(postEvents.referrerHost)
    .orderBy(sql`count(*) desc`)
    .limit(10) as { referrerHost: string | null; views: number }[];

  return {
    totalViews:     totals?.totalViews     ?? 0,
    views7d:        totals?.views7d        ?? 0,
    views30d:       totals?.views30d       ?? 0,
    uniqueVisitors: totals?.uniqueVisitors ?? 0,
    byCountry,
    byDevice,
    byReferrer,
  };
}

/**
 * Ranking de talentos por visitas acumuladas en artículos donde aparecen (talent_slugs jsonb).
 * Cruza post_events con posts via LATERAL jsonb_array_elements_text(talent_slugs) → talents.slug.
 */
export async function getTalentsByArticleViews(days = 30): Promise<TalentArticleViewRow[]> {
  const sinceDate = since(days);

  const result = await db.execute(sql`
    SELECT
      tl.id                                AS "talentId",
      tl.slug                              AS "talentSlug",
      tl.name                              AS "talentName",
      tl.photo_url                         AS "photoUrl",
      CAST(COUNT(pe.id) AS INT)            AS "articleViews",
      CAST(COUNT(DISTINCT p.id) AS INT)    AS "articleCount"
    FROM post_events pe
    INNER JOIN posts p ON p.id = pe.post_id,
    LATERAL jsonb_array_elements_text(p.talent_slugs) AS ts(slug)
    INNER JOIN talents tl ON tl.slug = ts.slug
    WHERE pe.action = 'view'
      AND pe.created_at >= ${sinceDate}
      AND jsonb_array_length(p.talent_slugs) > 0
    GROUP BY tl.id, tl.slug, tl.name, tl.photo_url
    ORDER BY "articleViews" DESC
    LIMIT 15
  `);

  const rows = result.rows as Array<{
    talentId: number; talentSlug: string; talentName: string;
    photoUrl: string | null; articleViews: number; articleCount: number;
  }>;

  if (rows.length === 0) return [];

  // Añadir visitas al perfil propio para cada talento encontrado
  const talentIds = rows.map((r) => r.talentId);
  const profileRows = await db
    .select({
      talentId:     talentProfileEvents.talentId,
      profileViews: sql<number>`cast(count(*) as int)`,
    })
    .from(talentProfileEvents)
    .where(
      and(
        eq(talentProfileEvents.action, 'view'),
        gt(talentProfileEvents.createdAt, since(days)),
        sql`${talentProfileEvents.talentId} = ANY(${sql.raw(`ARRAY[${talentIds.join(',')}]::int[]`)})`,
      ),
    )
    .groupBy(talentProfileEvents.talentId) as { talentId: number; profileViews: number }[];

  const profileMap = new Map(profileRows.map((r) => [r.talentId, r.profileViews]));

  return rows.map((r) => ({
    ...r,
    talentId:     Number(r.talentId),
    articleViews: Number(r.articleViews),
    articleCount: Number(r.articleCount),
    profileViews: profileMap.get(Number(r.talentId)) ?? 0,
  }));
}

/**
 * Visitas directas a perfiles de talentos.
 * Separado de getTalentsByArticleViews para poder mostrar ambos en la UI.
 */
export async function getTalentProfileViewsRanking(days = 30): Promise<Array<{
  talentId: number; talentSlug: string; talentName: string; photoUrl: string | null; views: number;
}>> {
  return db
    .select({
      talentId:   talents.id,
      talentSlug: talents.slug,
      talentName: talents.name,
      photoUrl:   talents.photoUrl,
      views:      sql<number>`cast(count(*) as int)`,
    })
    .from(talentProfileEvents)
    .innerJoin(talents, eq(talents.id, talentProfileEvents.talentId))
    .where(and(eq(talentProfileEvents.action, 'view'), gt(talentProfileEvents.createdAt, since(days))))
    .groupBy(talents.id, talents.slug, talents.name, talents.photoUrl)
    .orderBy(sql`count(*) desc`)
    .limit(10) as Promise<Array<{ talentId: number; talentSlug: string; talentName: string; photoUrl: string | null; views: number }>>;
}

/**
 * Ranking de marcas por visitas a artículos donde se mencionan.
 * Detección por texto (slug/title ILIKE). Arquitectura preparada para brand_slugs jsonb en v2:
 * cuando se añada posts.brand_slugs se puede reemplazar el CASE WHEN por LATERAL (igual que talent_slugs).
 *
 * TODO v2: añadir brand_slugs jsonb[] a posts (similar a talent_slugs) para migrar detección SQL a FK real.
 */
export async function getTopBrandsByViews(days = 30): Promise<BrandViewRow[]> {
  const sinceDate = since(days);

  const result = await db.execute(sql`
    SELECT
      brand_name                           AS brand,
      CAST(COUNT(pe.id) AS INT)            AS views,
      CAST(COUNT(DISTINCT p.id) AS INT)    AS articles
    FROM post_events pe
    INNER JOIN posts p ON p.id = pe.post_id
    CROSS JOIN LATERAL (
      SELECT CASE
        WHEN lower(p.slug) LIKE '%razer%'       OR lower(p.title) LIKE '%razer%'       THEN 'Razer'
        WHEN lower(p.slug) LIKE '%1win%'        OR lower(p.title) LIKE '%1win%'        THEN '1WIN'
        WHEN lower(p.slug) LIKE '%skinsmonkey%' OR lower(p.title) LIKE '%skinsmonkey%' THEN 'Skinsmonkey'
        WHEN lower(p.slug) LIKE '%keydrop%'     OR lower(p.title) LIKE '%keydrop%'     THEN 'Keydrop'
        WHEN lower(p.slug) LIKE '%hellcase%'    OR lower(p.title) LIKE '%hellcase%'    THEN 'Hellcase'
        WHEN lower(p.slug) LIKE '%skinplace%'   OR lower(p.title) LIKE '%skinplace%'   THEN 'Skinplace'
        ELSE NULL
      END AS brand_name
    ) b
    WHERE pe.action = 'view'
      AND pe.created_at >= ${sinceDate}
      AND b.brand_name IS NOT NULL
    GROUP BY b.brand_name
    ORDER BY views DESC
  `);

  return (result.rows as Array<{ brand: string; views: number; articles: number }>).map((r) => ({
    brand:    r.brand,
    views:    Number(r.views),
    articles: Number(r.articles),
  }));
}

/**
 * Distribución geográfica de visitas a artículos.
 */
export async function getViewsByCountry(days = 30): Promise<CountryViewRow[]> {
  const sinceDate = since(days);

  const rows = await db
    .select({
      country: postEvents.country,
      views:   sql<number>`cast(count(*) as int)`,
    })
    .from(postEvents)
    .where(and(eq(postEvents.action, 'view'), gt(postEvents.createdAt, sinceDate)))
    .groupBy(postEvents.country)
    .orderBy(sql`count(*) desc`)
    .limit(20) as { country: string | null; views: number }[];

  const total = rows.reduce((s, r) => s + r.views, 0);
  if (total === 0) return [];

  return rows.map((r) => ({
    country: r.country,
    views:   r.views,
    pct:     Math.round((r.views / total) * 100),
  }));
}

/**
 * Evolución mensual de visitas a artículos con delta vs mes anterior.
 * Devuelve hasta 12 meses. El primer mes siempre tiene delta null.
 */
export async function getPostViewsByMonth(): Promise<MonthlyViewRow[]> {
  const rows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${postEvents.createdAt} AT TIME ZONE 'UTC'), 'YYYY-MM')`,
      views: sql<number>`cast(count(*) as int)`,
    })
    .from(postEvents)
    .where(
      and(
        eq(postEvents.action, 'view'),
        gt(postEvents.createdAt, since(365)),
      ),
    )
    .groupBy(sql`date_trunc('month', ${postEvents.createdAt} AT TIME ZONE 'UTC')`)
    .orderBy(sql`date_trunc('month', ${postEvents.createdAt} AT TIME ZONE 'UTC') asc`)
    .limit(12) as { month: string; views: number }[];

  return rows.map((r, i) => {
    const prev = rows[i - 1];
    const delta = prev && prev.views > 0
      ? Math.round(((r.views - prev.views) / prev.views) * 100)
      : null;
    return { month: r.month, views: r.views, delta };
  });
}
