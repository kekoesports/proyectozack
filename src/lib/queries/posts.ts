import { cache } from 'react';
import { eq, desc, inArray, and, ne, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { posts, talents } from '@/db/schema';
import type { Post } from '@/types';
import { readTime } from '@/lib/utils/blog';

export type TalentAvatar = { slug: string; name: string; role: string; platform: string; photoUrl: string | null; initials: string; gradientC1: string; gradientC2: string; country: string | null };
export type PostWithTalents = Post & { talentAvatars: TalentAvatar[] };

// Shape para listados de /blog: omite bodyMd (puede ser kilobytes por post).
// readMinutes se computa en el server una sola vez. /news sigue usando
// PostWithTalents porque sus cards renderizan el bodyMd para preview.
export type PostListItem = Omit<Post, 'bodyMd'> & {
  readMinutes: number;
  talentAvatars: TalentAvatar[];
};

type Vertical = 'blog' | 'news';

async function loadTalentAvatars(rows: { talentSlugs: string[] | null }[]): Promise<Map<string, TalentAvatar>> {
  const allSlugs = [...new Set(rows.flatMap((p) => p.talentSlugs ?? []))];
  const avatarMap = new Map<string, TalentAvatar>();
  if (allSlugs.length === 0) return avatarMap;

  const talentRows = await db
    .select({ slug: talents.slug, name: talents.name, role: talents.role, platform: talents.platform, photoUrl: talents.photoUrl, initials: talents.initials, gradientC1: talents.gradientC1, gradientC2: talents.gradientC2, country: talents.creatorCountry })
    .from(talents)
    .where(inArray(talents.slug, allSlugs));
  for (const t of talentRows) avatarMap.set(t.slug, t);
  return avatarMap;
}

export async function attachTalents(rows: Post[]): Promise<PostWithTalents[]> {
  const avatarMap = await loadTalentAvatars(rows);
  return rows.map((p) => ({
    ...p,
    talentAvatars: (p.talentSlugs ?? [])
      .map((s) => avatarMap.get(s))
      .filter(Boolean) as TalentAvatar[],
  }));
}

/**
 * Convierte rows con bodyMd (uso interno) a PostListItem (sin bodyMd, con readMinutes)
 * enriquecidos con avatars. Garantiza que `bodyMd` NUNCA entra al RSC payload.
 */
async function projectListItems(rows: Post[]): Promise<PostListItem[]> {
  const avatarMap = await loadTalentAvatars(rows);
  return rows.map((p) => {
    const { bodyMd, ...rest } = p;
    return {
      ...rest,
      readMinutes: readTime(bodyMd),
      talentAvatars: (p.talentSlugs ?? [])
        .map((s) => avatarMap.get(s))
        .filter(Boolean) as TalentAvatar[],
    };
  });
}

/**
 * Slugs de posts publicados de la vertical indicada (para generateStaticParams).
 */
export async function getPostSlugsByVertical(
  vertical: Vertical,
): Promise<{ slug: string; updatedAt: Date }[]> {
  return db
    .select({ slug: posts.slug, updatedAt: posts.updatedAt })
    .from(posts)
    .where(and(eq(posts.status, 'published'), eq(posts.vertical, vertical)));
}

export async function getPostSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  return getPostSlugsByVertical('blog');
}

export async function getNewsSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  return getPostSlugsByVertical('news');
}

/** Devuelve los tags únicos de posts de /news publicados (para sitemap). */
export async function getNewsUniqueTags(): Promise<string[]> {
  const rows = await db
    .select({ tags: posts.tags })
    .from(posts)
    .where(and(eq(posts.status, 'published'), eq(posts.vertical, 'news')));
  return [...new Set(rows.flatMap((r) => r.tags ?? []))].filter(Boolean);
}

/**
 * Posts publicados del blog corporativo. Sin bodyMd, con readMinutes precomputado.
 */
export async function getPosts(): Promise<PostListItem[]> {
  const rows = await db.query.posts.findMany({
    where: and(eq(posts.status, 'published'), eq(posts.vertical, 'blog')),
    orderBy: [desc(posts.publishedAt)],
  });
  return projectListItems(rows);
}

/**
 * Posts publicados de /news (editorial esports). Mantiene bodyMd porque las
 * cards editoriales lo usan para preview/lectura.
 */
export async function getNewsPosts(): Promise<PostWithTalents[]> {
  const now = new Date();
  const rows = await db.query.posts.findMany({
    where: and(
      eq(posts.status, 'published'),
      eq(posts.vertical, 'news'),
      lte(posts.publishedAt, now),
    ),
    orderBy: [desc(posts.publishedAt)],
  });
  return attachTalents(rows);
}

/**
 * Devuelve un post por slug enriquecido con avatares de talents (incluye bodyMd
 * porque la ficha lo renderiza). Memoizado por request.
 *
 * @cache wrapped in React cache() for request dedupe
 * @visibility public
 */
export const getPostBySlug = cache(async (slug: string): Promise<PostWithTalents | undefined> => {
  const row = await db.query.posts.findFirst({
    where: and(eq(posts.slug, slug), eq(posts.status, 'published')),
  });
  if (!row) return undefined;
  const [enriched] = await attachTalents([row]);
  return enriched;
});

/**
 * Posts relacionados al actual (vertical blog), excluyéndolo.
 * Prioriza coincidencia de tags; usa fecha como desempate. Misma proyección
 * que `getPosts`: sin bodyMd, con readMinutes precomputado.
 *
 * @cache wrapped in React cache() for request dedupe
 * @visibility public
 */
export const getRelatedPosts = cache(async (currentSlug: string, limit = 3): Promise<PostListItem[]> => {
  const current = await getPostBySlug(currentSlug);
  const currentTags = current?.tags ?? [];
  const poolSize = Math.max(limit * 5, 15);

  const rows = await db.query.posts.findMany({
    where: and(
      eq(posts.status, 'published'),
      eq(posts.vertical, 'blog'),
      ne(posts.slug, currentSlug),
    ),
    orderBy: [desc(posts.sortOrder), desc(posts.publishedAt)],
    limit: poolSize,
  });

  if (currentTags.length > 0) {
    rows.sort((a, b) => {
      const sa = (a.tags ?? []).filter((t) => currentTags.includes(t)).length;
      const sb = (b.tags ?? []).filter((t) => currentTags.includes(t)).length;
      if (sb !== sa) return sb - sa;
      return (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
    });
  }

  return projectListItems(rows.slice(0, limit));
});

/**
 * Posts /news relacionados al actual, excluyéndolo. Para sidebar en /news/[slug].
 * Prioriza coincidencia de tags; usa fecha como desempate.
 * Mantiene bodyMd porque las cards editoriales lo necesitan.
 */
export async function getRelatedNewsPosts(
  currentSlug: string,
  limit = 4,
): Promise<PostWithTalents[]> {
  const current = await getPostBySlug(currentSlug);
  const currentTags = current?.tags ?? [];
  const poolSize = Math.max(limit * 5, 20);

  const rows = await db.query.posts.findMany({
    where: and(
      eq(posts.status, 'published'),
      eq(posts.vertical, 'news'),
      ne(posts.slug, currentSlug),
    ),
    orderBy: [desc(posts.sortOrder), desc(posts.publishedAt)],
    limit: poolSize,
  });

  if (currentTags.length > 0) {
    rows.sort((a, b) => {
      const sa = (a.tags ?? []).filter((t) => currentTags.includes(t)).length;
      const sb = (b.tags ?? []).filter((t) => currentTags.includes(t)).length;
      if (sb !== sa) return sb - sa;
      return (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
    });
  }

  return attachTalents(rows.slice(0, limit));
}
