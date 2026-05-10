import { and, eq, ne, desc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { posts } from '@/db/schema';
import type { PostWithTalents, TalentAvatar } from '@/lib/queries/posts';
import { deriveNewsCategory, type NewsCategory } from '@/lib/utils/news';
import { tagLabel } from './tags';

export type EcosystemTag = {
  readonly slug: string;
  readonly label: string;
};

export type EcosystemRelations = {
  readonly creators: readonly TalentAvatar[];
  readonly tags: readonly EcosystemTag[];
  readonly category: NewsCategory;
  readonly relatedPosts: readonly RelatedPostLite[];
  readonly channelTelegram: { readonly url: string; readonly label: string } | null;
};

export type RelatedPostLite = {
  readonly slug: string;
  readonly title: string;
  readonly coverUrl: string | null;
  readonly publishedAt: Date | null;
};

const TELEGRAM_URL = 'https://t.me/+B65oaDw_4jhmNDFk';

const COMMUNITY_TRIGGERS = new Set([
  'apuesta-segura-cs2',
  'telegram',
  'blogabet',
  'picks',
]);

function shouldShowTelegram(post: PostWithTalents, category: NewsCategory): boolean {
  if (category.slug === 'comunidad') return true;
  const tags = post.tags ?? [];
  return tags.some((t) => COMMUNITY_TRIGGERS.has(t));
}

/**
 * Devuelve los slugs de posts /news que comparten al menos un tag con el
 * post actual. Implementación con `?| array` (jsonb operator overlap),
 * acotada y excluyendo el post actual.
 */
async function findRelatedByTags(
  currentSlug: string,
  tags: readonly string[],
  limit: number,
): Promise<RelatedPostLite[]> {
  if (tags.length === 0) return [];
  const tagsArray = sql`array[${sql.join(
    tags.map((t) => sql`${t}`),
    sql`, `,
  )}]::text[]`;
  const rows = await db
    .select({
      slug: posts.slug,
      title: posts.title,
      coverUrl: posts.coverUrl,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(
      and(
        eq(posts.status, 'published'),
        eq(posts.vertical, 'news'),
        ne(posts.slug, currentSlug),
        sql`(${posts.tags})::jsonb ?| ${tagsArray}`,
      ),
    )
    .orderBy(desc(posts.publishedAt))
    .limit(limit);
  return rows;
}

/**
 * Resolver del "ecosystem" de un post /news — creators mencionados, tags
 * canónicos, posts relacionados por tag overlap y canales asociados.
 *
 * Slots devueltos sólo se pintan en UI si hay contenido (sin placeholders
 * vacíos). Sponsors queda como fase 2 — ahora null.
 */
export async function getPostEcosystem(post: PostWithTalents): Promise<EcosystemRelations> {
  const category = deriveNewsCategory(post.slug, post.title);
  const tags = (post.tags ?? []).map((slug) => ({ slug, label: tagLabel(slug) }));

  const relatedPosts = await findRelatedByTags(post.slug, post.tags ?? [], 4);

  const channelTelegram = shouldShowTelegram(post, category)
    ? { url: TELEGRAM_URL, label: 'Apuesta Segura CS2' }
    : null;

  return {
    creators: post.talentAvatars,
    tags,
    category,
    relatedPosts,
    channelTelegram,
  };
}
