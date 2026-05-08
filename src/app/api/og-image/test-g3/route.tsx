import { ImageResponse } from 'next/og';
import { db } from '@/lib/db';

// test-g2 + position:absolute bars (same as giveaway)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id') ?? '1', 10);

    const rows = await db.$client`
      SELECT g.title, t.gradient_c1, t.gradient_c2
      FROM giveaways g
      INNER JOIN talents t ON t.id = g.talent_id
      WHERE g.id = ${id}
      LIMIT 1
    `;

    const g = rows[0];
    const title = g ? String(g.title ?? 'Sorteo') : 'Sorteo SocialPro';
    const c1 = g ? String(g.gradient_c1 ?? '#f5632a') : '#f5632a';
    const c2 = g ? String(g.gradient_c2 ?? '#8b3aad') : '#8b3aad';

    return new ImageResponse(
      <div style={{ width: '100%', height: '100%', background: '#050507', display: 'flex', position: 'relative' }}>
        {/* Top accent bar — position:absolute */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: `linear-gradient(90deg,${c1},${c2})` }} />
        {/* Bottom accent bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: c1 }} />

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: 16, color: c1, fontWeight: 700 }}>SocialPro · Sorteo</div>
          <div style={{ fontSize: 48, fontWeight: 900, color: '#ffffff', textTransform: 'uppercase' as const }}>{title.slice(0, 40)}</div>
        </div>
      </div>,
      { width: 1200, height: 630 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(`TEST_G3_ERROR: ${msg}`, { status: 500, headers: { 'content-type': 'text/plain' } });
  }
}
