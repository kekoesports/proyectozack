'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { requirePermission } from '@/lib/permissions';
import { db } from '@/lib/db';
import { posts, editorialSlots } from '@/db/schema';
import { PostCreateSchema, PostUpdateSchema, EditorialSlotSchema } from '@/lib/schemas/posts';

type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function revalidateNews(slug?: string) {
  revalidatePath('/news');
  revalidatePath('/admin/noticias');
  if (slug) revalidatePath(`/news/${slug}`, 'page');
}

export async function createPostAction(formData: FormData): Promise<ActionResult> {
  await requirePermission('noticias', 'write');

  const raw = Object.fromEntries(formData);
  const parsed = PostCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'Datos inválidos', fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const data = parsed.data;

  // Verificar slug único
  const existing = await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, data.slug)).limit(1);
  if (existing.length > 0) {
    return { ok: false, error: 'El slug ya existe', fieldErrors: { slug: ['Este slug ya está en uso'] } };
  }

  // Auto-set publishedAt to now when publishing without explicit date
  const publishedAt = data.publishedAt ?? (data.status === 'published' ? new Date() : null);

  await db.insert(posts).values({
    slug: data.slug,
    title: data.title,
    excerpt: data.excerpt,
    bodyMd: data.bodyMd,
    author: data.author,
    status: data.status,
    vertical: data.vertical,
    coverUrl: data.coverUrl ?? null,
    ogImageUrl: data.ogImageUrl ?? null,
    publishedAt,
    sortOrder: data.sortOrder,
    tags: data.tags,
    talentSlugs: data.talentSlugs ?? null,
    blocksJson: data.blocksJson ?? null,
  });

  revalidateNews(data.slug);
  redirect('/admin/noticias');
}

export async function updatePostAction(formData: FormData): Promise<ActionResult> {
  await requirePermission('noticias', 'write');

  const raw = Object.fromEntries(formData);
  const parsed = PostUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'Datos inválidos', fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { id, ...data } = parsed.data;

  // Si cambia slug, verificar que no exista en otro post
  if (data.slug) {
    const existing = await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, data.slug)).limit(1);
    if (existing.length > 0 && existing[0]?.id !== id) {
      return { ok: false, error: 'El slug ya existe', fieldErrors: { slug: ['Este slug ya está en uso'] } };
    }
  }

  // publishedAt logic — server-side source of truth, never relies on form value alone:
  // 1. If post is already published in the past → preserve that date (editing never unpublishes)
  // 2. If publishing for the first time (no existing date) → set NOW()
  // 3. If explicit future date sent from form → use it (intentional scheduling)
  // 4. If changing to draft → clear the date
  const currentRow = await db.select({ publishedAt: posts.publishedAt, status: posts.status, slug: posts.slug })
    .from(posts).where(eq(posts.id, id)).limit(1);
  const currentSlug = currentRow[0]?.slug;
  const existingPublishedAt = currentRow[0]?.publishedAt ?? null;
  const alreadyPublished    = !!(existingPublishedAt && existingPublishedAt <= new Date());

  let publishedAt: Date | null;
  if (data.status !== 'published') {
    publishedAt = null;                                          // draft → no date
  } else if (alreadyPublished) {
    publishedAt = existingPublishedAt;                          // already live → keep original date
  } else if (data.publishedAt && data.publishedAt > new Date()) {
    publishedAt = data.publishedAt;                             // explicit future → schedule
  } else {
    publishedAt = new Date();                                    // publish now
  }

  await db
    .update(posts)
    .set({
      ...data,
      coverUrl: data.coverUrl ?? null,
      ogImageUrl: data.ogImageUrl ?? null,
      publishedAt,
      talentSlugs: data.talentSlugs ?? null,
      blocksJson: data.blocksJson ?? null,
    })
    .where(eq(posts.id, id));

  // Revalidate the new slug (from form) AND the old slug in case it changed
  revalidateNews(data.slug ?? currentSlug);
  if (currentSlug && currentSlug !== data.slug) {
    revalidatePath(`/news/${currentSlug}`, 'page');
  }
  redirect('/admin/noticias');
}

export async function deletePostAction(formData: FormData): Promise<ActionResult> {
  await requirePermission('noticias', 'delete');

  const idRaw = formData.get('id');
  const id = typeof idRaw === 'string' ? parseInt(idRaw, 10) : NaN;
  if (isNaN(id)) return { ok: false, error: 'ID inválido' };

  // Limpiar slots que apunten a este post antes de borrar
  await db.update(editorialSlots).set({ postId: null }).where(eq(editorialSlots.postId, id));
  await db.delete(posts).where(eq(posts.id, id));

  revalidateNews();
  return { ok: true };
}

/** Wrapper void para usar en <form action={}> desde Server Components. */
export async function deletePostVoidAction(formData: FormData): Promise<void> {
  await deletePostAction(formData);
}

export async function updateFeaturedMatchAction(formData: FormData): Promise<void> {
  await requirePermission('noticias', 'publish');
  const { FeaturedMatchSchema } = await import('@/lib/schemas/posts');
  const parsed = FeaturedMatchSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  // Always persist full shape including isActive (even when false)
  const meta = { ...parsed.data };
  await db
    .update(editorialSlots)
    .set({ meta })
    .where(eq(editorialSlots.slot, 'featured_match'));
  revalidatePath('/news');
  revalidatePath('/admin/noticias/slots');
}

export async function updateEditorialSlotAction(formData: FormData): Promise<void> {
  await requirePermission('noticias', 'publish');

  const raw = Object.fromEntries(formData);
  const parsed = EditorialSlotSchema.safeParse(raw);
  if (!parsed.success) return;

  const { slot, postId } = parsed.data;

  await db
    .update(editorialSlots)
    .set({ postId })
    .where(eq(editorialSlots.slot, slot));

  revalidatePath('/news');
  revalidatePath('/admin/noticias/slots');
}
