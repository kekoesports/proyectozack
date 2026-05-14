import { ImageResponse } from 'next/og';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const SIZE = { width: 1200, height: 630 };

const C1 = '#f5632a';
const C2 = '#8b3aad';

export async function GET() {
  try {
    let totalWinners = 0;
    let totalValue = 0;

    try {
      const rows = await db.$client`
        SELECT COUNT(*)::int AS cnt,
               COALESCE(SUM(
                 CASE WHEN g.value ~ '^[0-9.,]+' THEN
                   replace(split_part(g.value, ' ', 1), ',', '.')::numeric
                 ELSE 0 END
               ), 0)::int AS total_value
        FROM giveaway_winners gw
        JOIN giveaways g ON g.id = gw.giveaway_id
      `;
      totalWinners = (rows[0] as { cnt: number; total_value: number })?.cnt ?? 0;
      totalValue   = (rows[0] as { cnt: number; total_value: number })?.total_value ?? 0;
    } catch { /* fall back to zeros */ }

    const valueStr = totalValue > 0
      ? `+${Math.round(totalValue).toLocaleString('es-ES')}€`
      : '';

    const imgResp = new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', background: '#06060b', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', position: 'relative' }}>

          {/* Gradient top bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: `linear-gradient(90deg,${C1},${C2})` }} />

          {/* Subtle radial glow */}
          <div style={{ position: 'absolute', top: -200, left: -200, width: 700, height: 700, borderRadius: '50%', background: 'rgba(245,99,42,0.06)' }} />
          <div style={{ position: 'absolute', bottom: -200, right: -200, width: 700, height: 700, borderRadius: '50%', background: 'rgba(139,58,173,0.07)' }} />

          {/* Main content */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '56px 96px', gap: 80 }}>

            {/* Trophy / icon block */}
            <div style={{
              width: 200, height: 200, borderRadius: 28, flexShrink: 0,
              background: 'linear-gradient(135deg,rgba(245,99,42,0.12),rgba(139,58,173,0.12))',
              border: '1px solid rgba(245,99,42,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 88,
            }}>
              🏆
            </div>

            {/* Right: text */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>

              {/* Label */}
              <div style={{ fontSize: 13, color: C1, letterSpacing: 5, textTransform: 'uppercase', fontWeight: 700 }}>
                SocialPro · Prueba Social
              </div>

              {/* Title */}
              <div style={{ fontSize: 62, fontWeight: 900, color: '#ffffff', lineHeight: 1, letterSpacing: -2, textTransform: 'uppercase' }}>
                Ganadores de Sorteos
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 8 }}>
                {totalWinners > 0 && (
                  <div style={{
                    padding: '8px 22px', borderRadius: 100,
                    background: `linear-gradient(90deg,${C1},${C2})`,
                    fontSize: 24, fontWeight: 900, color: 'white',
                  }}>
                    {`${totalWinners} premios`}
                  </div>
                )}
                {valueStr && (
                  <div style={{
                    padding: '8px 22px', borderRadius: 100,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,0.7)',
                  }}>
                    {valueStr}
                  </div>
                )}
              </div>

              <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.30)', marginTop: 4, fontWeight: 500 }}>
                Todos los ganadores reales de los sorteos de nuestros creadores
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '0 88px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)', letterSpacing: 2 }}>
              socialpro.es/ganadores
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.10)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>
              SocialPro
            </div>
          </div>

          {/* Gradient bottom bar */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${C1},${C2})` }} />
        </div>
      ),
      { ...SIZE },
    );

    const bytes = await imgResp.arrayBuffer();
    return new Response(bytes, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return new Response(`GANADORES_OG_ERROR\n\n${msg}`, {
      status: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }
}
