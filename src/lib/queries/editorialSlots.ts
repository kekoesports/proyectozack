import { eq, lte, and, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { editorialSlots, posts } from '@/db/schema';
import type { EditorialSlotKey } from '@/db/schema/editorialSlots';
import { attachTalents, type PostWithTalents } from './posts';

export type SlotWithPost = {
  slot: EditorialSlotKey;
  post: PostWithTalents | null;
  meta: Record<string, unknown> | null;
};

/** Devuelve todos los slots con su post asociado (si existe y está publicado). */
export async function getEditorialSlots(): Promise<SlotWithPost[]> {
  const now = new Date();
  const rows = await db
    .select({
      slot: editorialSlots.slot,
      meta: editorialSlots.meta,
      postId: editorialSlots.postId,
      postSlug: posts.slug,
      postTitle: posts.title,
      postExcerpt: posts.excerpt,
      postBodyMd: posts.bodyMd,
      postCoverUrl: posts.coverUrl,
      postOgImageUrl: posts.ogImageUrl,
      postAuthor: posts.author,
      postStatus: posts.status,
      postVertical: posts.vertical,
      postPublishedAt: posts.publishedAt,
      postSortOrder: posts.sortOrder,
      postContentType: posts.contentType,
      postTalentSlugs: posts.talentSlugs,
      postTags: posts.tags,
      postBlocksJson: posts.blocksJson,
      postUpdatedAt: posts.updatedAt,
    })
    .from(editorialSlots)
    .leftJoin(
      posts,
      and(
        eq(editorialSlots.postId, posts.id),
        eq(posts.status, 'published'),
        lte(posts.publishedAt, now),
      ),
    )
    .orderBy(editorialSlots.id);

  type FullRow = typeof rows[number] & {
    postId: number;
    postSlug: string;
    postTitle: string;
    postExcerpt: string;
    postBodyMd: string;
    postAuthor: string;
    postStatus: string;
    postVertical: string;
    postSortOrder: number;
    postUpdatedAt: Date;
  };

  function hasPost(r: typeof rows[number]): r is FullRow {
    return r.postId !== null && r.postSlug !== null;
  }

  const postRows = rows.filter(hasPost).map((r) => ({
    id: r.postId,
    slug: r.postSlug,
    title: r.postTitle,
    excerpt: r.postExcerpt,
    bodyMd: r.postBodyMd,
    coverUrl: r.postCoverUrl ?? null,
    ogImageUrl: r.postOgImageUrl ?? null,
    author: r.postAuthor,
    status: r.postStatus as 'draft' | 'published',
    vertical: r.postVertical as 'blog' | 'news',
    contentType: (r.postContentType ?? 'noticias') as 'noticias' | 'analisis' | 'estadisticas',
    publishedAt: r.postPublishedAt ?? null,
    sortOrder: r.postSortOrder,
    talentSlugs: r.postTalentSlugs as string[] | null,
    tags: r.postTags as string[],
    blocksJson: r.postBlocksJson ?? null,
    updatedAt: r.postUpdatedAt,
  }));

  const enriched = await attachTalents(postRows);
  const enrichedMap = new Map(enriched.map((p) => [p.id, p]));

  return rows.map((r) => ({
    slot: r.slot as EditorialSlotKey,
    meta: r.meta as Record<string, unknown> | null,
    post: r.postId !== null ? (enrichedMap.get(r.postId) ?? null) : null,
  }));
}

/** Devuelve el post asignado a un slot concreto, o null si vacío/no publicado. */
export async function getSlotPost(slot: EditorialSlotKey): Promise<PostWithTalents | null> {
  const slots = await getEditorialSlots();
  return slots.find((s) => s.slot === slot)?.post ?? null;
}

/** Para el admin: todos los slots con su postId (sin joins complejos). */
export async function getEditorialSlotsForAdmin() {
  return db
    .select({
      id: editorialSlots.id,
      slot: editorialSlots.slot,
      postId: editorialSlots.postId,
      meta: editorialSlots.meta,
      updatedAt: editorialSlots.updatedAt,
    })
    .from(editorialSlots)
    .orderBy(editorialSlots.id);
}

/** Para el admin: lista de posts publicados (news) para el selector. */
export async function getPublishedNewsPostsForAdmin() {
  const now = new Date();
  return db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(
      and(
        eq(posts.status, 'published'),
        eq(posts.vertical, 'news'),
        lte(posts.publishedAt, now),
      ),
    )
    .orderBy(desc(posts.publishedAt));
}

/** Admin: lista de todos los posts news (draft + publicados + programados). */
export async function getAllNewsPostsForAdmin(contentType?: 'noticias' | 'analisis' | 'estadisticas') {
  return db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      status: posts.status,
      publishedAt: posts.publishedAt,
      updatedAt: posts.updatedAt,
      author: posts.author,
      vertical: posts.vertical,
      contentType: posts.contentType,
      tags: posts.tags,
      coverUrl: posts.coverUrl,
    })
    .from(posts)
    .where(
      contentType
        ? and(eq(posts.vertical, 'news'), eq(posts.contentType, contentType))
        : eq(posts.vertical, 'news'),
    )
    .orderBy(desc(posts.updatedAt));
}
