import { ImageResponse } from 'next/og';
import { db } from '@/lib/db';
import { talents } from '@/db/schema';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // Test DB connectivity
    const rows = await db.select({ count: sql<number>`count(*)` }).from(talents);
    const count = rows[0]?.count ?? 0;

    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', background: '#050507', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
          <span style={{ fontSize: 80, fontWeight: 900, color: '#f5632a' }}>TEST OK</span>
          <span style={{ fontSize: 40, color: 'white' }}>Talentos en DB: {String(count)}</span>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  } catch (err) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}\n\n${err.stack ?? ''}` : String(err);
    return new Response(`OG_TEST_ERROR\n\n${msg}`, {
      status: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }
}
