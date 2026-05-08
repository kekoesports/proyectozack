import { db } from '@/lib/db';
import { posts } from '@/db/schema/posts';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const rows = await db.select({ id: posts.id, title: posts.title }).from(posts).limit(1);
    return Response.json({ ok: true, count: rows.length, first: rows[0]?.title ?? null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
