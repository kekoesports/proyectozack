import { cache } from 'react';
import { eq, desc, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { posts, talents } from '@/db/schema';
import type { Post } from '@/types';

export type TalentAvatar = { slug: string; name: string; role: string; platform: string; photoUrl: string | null; initials: string; gradientC1: string; gradientC2: string };
export type PostWithTalents = Post & { talentAvatars: TalentAvatar[] };

/**
 * Devuelve los slugs de posts publicados, usado para `generateStaticParams` en `/blog/[slug]`.
 *
 * @cache none
 * @visibility public
 * @returns array de `{ slug, updatedAt }` (puede ser vacío). Nunca null.
 */
export async function getPostSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  return db
    .select({ slug: posts.slug, updatedAt: posts.updatedAt })
    .from(posts)
    .where(eq(posts.status, 'published'));
}

async function attachTalents(rows: Post[]): Promise<PostWithTalents[]> {
  const allSlugs = [...new Set(rows.flatMap((p) => p.talentSlugs ?? []))];
  const avatarMap = new Map<string, TalentAvatar>();

  if (allSlugs.length > 0) {
    const talentRows = await db
      .select({ slug: talents.slug, name: talents.name, role: talents.role, platform: talents.platform, photoUrl: talents.photoUrl, initials: talents.initials, gradientC1: talents.gradientC1, gradientC2: talents.gradientC2 })
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
 * Lista posts publicados ordenados por publishedAt DESC y enriquecidos con avatares de talents mencionados, para `/blog`.
 *
 * @cache none
 * @visibility public
 * @returns array de PostWithTalents (puede ser vacío). Nunca null.
 */
export async function getPosts(): Promise<PostWithTalents[]> {
  const rows = await db.query.posts.findMany({
    where: eq(posts.status, 'published'),
    orderBy: [desc(posts.publishedAt)],
  });
  return attachTalents(rows);
}

/**
 * Devuelve un post por slug enriquecido con avatares de talents mencionados, para la ficha `/blog/[slug]`.
 *
 * @cache wrapped in React cache() for request dedupe
 * @visibility public
 * @returns PostWithTalents | undefined (nunca null) si no existe el slug.
 */
export const getPostBySlug = cache(async (slug: string): Promise<PostWithTalents | undefined> => {
  const row = await db.query.posts.findFirst({ where: eq(posts.slug, slug) });
  if (!row) return undefined;
  const [enriched] = await attachTalents([row]);
  return enriched;
});
