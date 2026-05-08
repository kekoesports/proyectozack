import { ImageResponse } from 'next/og';
import { db } from '@/lib/db';
import { posts } from '@/db/schema/posts';

export async function GET() {
  try {
    const rows = await db.select({ title: posts.title }).from(posts).limit(1);
    const title = rows[0]?.title ?? 'SocialPro';
    return new ImageResponse(
      <div style={{ width: '100%', height: '100%', background: '#050507', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'white', fontSize: 48, fontWeight: 900 }}>{title.slice(0, 40)}</span>
      </div>,
      { width: 1200, height: 630 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(`COMBO_ERROR: ${msg}`, { status: 500, headers: { 'content-type': 'text/plain' } });
  }
}
