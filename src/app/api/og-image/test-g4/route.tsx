import { ImageResponse } from 'next/og';
import { db } from '@/lib/db';

// Full giveaway JSX but WITHOUT fetchBase64/Buffer/img — only prizeSrc=null path
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id') ?? '1', 10);

    let title = 'Sorteo Gaming';
    let value: string | null = null;
    let brandName = 'SocialPro';
    let talentName = '';
    let talentSlug = '';
    let c1 = '#f5632a', c2 = '#8b3aad';

    if (!isNaN(id)) {
      const rows = await db.$client`
        SELECT g.title, g.value, g.brand_name, t.name AS talent_name, t.slug AS talent_slug, t.gradient_c1, t.gradient_c2
        FROM giveaways g
        INNER JOIN talents t ON t.id = g.talent_id
        WHERE g.id = ${id}
        LIMIT 1
      `;
      const g = rows[0];
      if (g) {
        title      = String(g.title ?? title);
        value      = g.value ? String(g.value) : null;
        brandName  = String(g.brand_name ?? brandName);
        talentName = String(g.talent_name ?? '');
        talentSlug = String(g.talent_slug ?? '');
        c1         = String(g.gradient_c1 ?? c1);
        c2         = String(g.gradient_c2 ?? c2);
      }
    }

    const titleSize = title.length > 40 ? 40 : title.length > 25 ? 50 : 60;

    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', background: '#050507', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: `linear-gradient(90deg,${c1},${c2})` }} />
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(180deg,${c1},${c2})` }} />

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 56, padding: '56px 72px 40px 80px' }}>
            {/* Always brand badge — no img conditional */}
            <div style={{ width: 220, height: 220, borderRadius: 20, flexShrink: 0, background: `linear-gradient(135deg,${c1},${c2})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 72, fontWeight: 900, color: 'white' }}>
                {brandName.slice(0, 2).toUpperCase()}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: c1, letterSpacing: 5, textTransform: 'uppercase', fontWeight: 700 }}>
                SocialPro · Sorteo
              </div>
              <div style={{ fontSize: titleSize, fontWeight: 900, color: '#ffffff', lineHeight: 1.05, letterSpacing: -1, textTransform: 'uppercase', overflow: 'hidden' }}>
                {title}
              </div>
              {value && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <div style={{ padding: '6px 18px', borderRadius: 100, background: `linear-gradient(90deg,${c1},${c2})`, fontSize: 22, fontWeight: 900, color: 'white', letterSpacing: 1 }}>
                    {value}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
                <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{brandName}</span>
                {talentName && (
                  <>
                    <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 14 }}>·</span>
                    <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.30)', fontWeight: 500 }}>con {talentName}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div style={{ padding: '0 72px 24px 80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)', letterSpacing: 2 }}>
              socialpro.es/giveaways{talentSlug ? ` · ${talentSlug}` : ''}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.12)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>SocialPro</div>
          </div>

          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${c1},${c2})` }} />
        </div>
      ),
      { width: 1200, height: 630 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(`TEST_G4_ERROR: ${msg}`, { status: 500, headers: { 'content-type': 'text/plain' } });
  }
}
