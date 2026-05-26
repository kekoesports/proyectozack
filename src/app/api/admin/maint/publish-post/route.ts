'use server';
import { NextResponse } from 'next/server';
import { like, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { posts } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';

export async function POST(req: Request) {
  try {
    await requirePermission('noticias', 'publish');
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { slug } = await req.json() as { slug?: string };
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

  const rows = await db.select({ id: posts.id, slug: posts.slug, status: posts.status, publishedAt: posts.publishedAt })
    .from(posts)
    .where(like(posts.slug, `%${slug}%`));

  if (rows.length === 0) return NextResponse.json({ error: 'no posts found', slug }, { status: 404 });
  if (rows.length > 1) return NextResponse.json({ error: 'multiple posts match — be more specific', matches: rows.map(r => r.slug) }, { status: 400 });

  const post = rows[0]!;
  if (post.status === 'published') {
    return NextResponse.json({ message: 'already published', slug: post.slug });
  }

  const now = new Date();
  await db.update(posts).set({ status: 'published', publishedAt: now }).where(eq(posts.id, post.id));

  return NextResponse.json({ ok: true, published: post.slug, publishedAt: now.toISOString() });
}
