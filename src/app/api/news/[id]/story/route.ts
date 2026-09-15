import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { posts } from '@/db/schema';
import { NewsSocialPostId } from '@/lib/schemas/news-social';
import { isPublicNews } from '@/lib/news-social/policy';
import { renderNewsStory } from '@/lib/news-social/story';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const parsed = NewsSocialPostId.safeParse((await context.params).id);
  if (!parsed.success) return new Response('Not found', { status: 404 });
  const [post] = await db.select().from(posts).where(eq(posts.id, parsed.data)).limit(1);
  if (!post || !isPublicNews(post, new Date())) return new Response('Not found', { status: 404 });
  const image = await renderNewsStory({ title: post.title, excerpt: post.excerpt });
  return new Response(Uint8Array.from(image), { headers: {
    'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store',
    'Content-Disposition': `inline; filename="socialpro-noticia-${post.id}-story.jpg"`,
    'X-Robots-Tag': 'noindex',
  } });
}
