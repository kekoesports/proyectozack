import { cache } from 'react';
import { eq, desc, inArray, and, ne } from 'drizzle-orm';
import { db } from '@/lib/db';
import { posts, talents } from '@/db/schema';
import type { Post } from '@/types';

export type TalentAvatar = { slug: string; name: string; role: string; platform: string; photoUrl: string | null; initials: string; gradientC1: string; gradientC2: string; country: string | null };
export type PostWithTalents = Post & { talentAvatars: TalentAvatar[] };

type Vertical = 'blog' | 'news';

async function attachTalents(rows: Post[]): Promise<PostWithTalents[]> {
  const allSlugs = [...new Set(rows.flatMap((p) => p.talentSlugs ?? []))];
  const avatarMap = new Map<string, TalentAvatar>();

  if (allSlugs.length > 0) {
    const talentRows = await db
      .select({ slug: talents.slug, name: talents.name, role: talents.role, platform: talents.platform, photoUrl: talents.photoUrl, initials: talents.initials, gradientC1: talents.gradientC1, gradientC2: talents.gradientC2, country: talents.creatorCountry })
      .from(talents)
      .where(inArray(talents.slug, allSlugs));
    for (const t of talentRows) avatarMap.set(t.slug, t);
  }

  return rows.map((p) => ({
    ...p,
    talentAvatars: (p.talentSlugs ?? [])
      .map((s) => avatarMap.get(s))
      .filter(Boolean) as TalentAvatar[],
  }));
}

/**
 * Devuelve slugs de posts publicados de la vertical indicada para
 * `generateStaticParams` en `/blog/[slug]` y `/news/[slug]`.
 */
export async function getPostSlugsByVertical(
  vertical: Vertical,
): Promise<{ slug: string; updatedAt: Date }[]> {
  return db
    .select({ slug: posts.slug, updatedAt: posts.updatedAt })
    .from(posts)
    .where(and(eq(posts.status, 'published'), eq(posts.vertical, vertical)));
}

/**
 * Wrapper retrocompat — devuelve sólo slugs de la vertical 'blog'.
 *
 * @cache none
 * @visibility public
 */
export async function getPostSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  return getPostSlugsByVertical('blog');
}

/**
 * Slugs de posts /news publicados.
 *
 * @cache none
 * @visibility public
 */
export async function getNewsSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  return getPostSlugsByVertical('news');
}

/**
 * Lista posts publicados de una vertical, ordenados por publishedAt DESC y
 * enriquecidos con avatares de talents mencionados.
 */
export async function getPostsByVertical(vertical: Vertical): Promise<PostWithTalents[]> {
  const rows = await db.query.posts.findMany({
    where: and(eq(posts.status, 'published'), eq(posts.vertical, vertical)),
    orderBy: [desc(posts.publishedAt)],
  });
  return attachTalents(rows);
}

/**
 * Posts publicados del blog corporativo. Mantiene contrato previo.
 *
 * @cache none
 * @visibility public
 * @returns array de PostWithTalents (puede ser vacío). Nunca null.
 */
export async function getPosts(): Promise<PostWithTalents[]> {
  return getPostsByVertical('blog');
}

/**
 * Posts publicados de la vertical /news (editorial esports).
 *
 * @cache none
 * @visibility public
 */
export async function getNewsPosts(): Promise<PostWithTalents[]> {
  return getPostsByVertical('news');
}

/**
 * Devuelve un post por slug enriquecido con avatares de talents.
 * No filtra por vertical — el caller debe asegurar coherencia entre la
 * ruta y la vertical del post (404 si no coincide).
 *
 * @cache wrapped in React cache() for request dedupe
 * @visibility public
 */
export const getPostBySlug = cache(async (slug: string): Promise<PostWithTalents | undefined> => {
  const row = await db.query.posts.findFirst({ where: eq(posts.slug, slug) });
  if (!row) return undefined;
  const [enriched] = await attachTalents([row]);
  return enriched;
});

export async function getRelatedPosts(currentSlug: string, limit = 3): Promise<PostWithTalents[]> {
  const rows = await db.query.posts.findMany({
    where: and(
      eq(posts.status, 'published'),
      eq(posts.vertical, 'blog'),
      ne(posts.slug, currentSlug),
    ),
    orderBy: [desc(posts.sortOrder), desc(posts.publishedAt)],
    limit,
  });
  return attachTalents(rows);
}

/**
 * Posts /news relacionados al actual, excluyéndolo. Para sidebar en /news/[slug].
 */
export async function getRelatedNewsPosts(
  currentSlug: string,
  limit = 4,
): Promise<PostWithTalents[]> {
  const rows = await db.query.posts.findMany({
    where: and(
      eq(posts.status, 'published'),
      eq(posts.vertical, 'news'),
      ne(posts.slug, currentSlug),
    ),
    orderBy: [desc(posts.sortOrder), desc(posts.publishedAt)],
    limit,
  });
  return attachTalents(rows);
}
