import { ImageResponse } from 'next/og';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { giveaways } from '@/db/schema/giveaways';
import { talents } from '@/db/schema/talents';

const SIZE = { width: 1200, height: 630 };

async function fetchBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const mime = res.headers.get('content-type') ?? 'image/jpeg';
    return `data:${mime};base64,${Buffer.from(buf).toString('base64')}`;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id') ?? '', 10);

    let title = 'Sorteo Gaming';
    let value: string | null = null;
    let brandName = 'SocialPro';
    let talentName = '';
    let talentSlug = '';
    let c1 = '#f5632a', c2 = '#8b3aad';
    let prizeSrc: string | null = null;

    if (!isNaN(id)) {
      try {
        const rows = await db
          .select({
            title:      giveaways.title,
            value:      giveaways.value,
            brandName:  giveaways.brandName,
            imageUrl:   giveaways.imageUrl,
            talentName: talents.name,
            talentSlug: talents.slug,
            c1:         talents.gradientC1,
            c2:         talents.gradientC2,
          })
          .from(giveaways)
          .innerJoin(talents, eq(talents.id, giveaways.talentId))
          .where(eq(giveaways.id, id))
          .limit(1);

        const g = rows[0];
        if (g) {
          title      = g.title;
          value      = g.value;
          brandName  = g.brandName;
          talentName = g.talentName;
          talentSlug = g.talentSlug;
          c1         = g.c1;
          c2         = g.c2;
          if (g.imageUrl) {
            const raw = g.imageUrl.startsWith('http') ? g.imageUrl : `https://socialpro.es${g.imageUrl}`;
            prizeSrc = await fetchBase64(raw);
          }
        }
      } catch { /* fallback a defaults */ }
    }

    const titleSize = title.length > 40 ? 40 : title.length > 25 ? 50 : 60;

    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', background: '#050507', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', position: 'relative' }}>
          {/* Gradient top bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: `linear-gradient(90deg,${c1},${c2})` }} />
          {/* Gradient left bar */}
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(180deg,${c1},${c2})` }} />

          {/* Main content */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 56, padding: '56px 72px 40px 80px' }}>

            {/* Left: prize image or brand badge */}
            {prizeSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={prizeSrc}
                width={220} height={220}
                style={{ borderRadius: 20, objectFit: 'contain', flexShrink: 0, background: 'rgba(255,255,255,0.04)', padding: 12 }}
                alt={title}
              />
            ) : (
              <div style={{
                width: 220, height: 220, borderRadius: 20, flexShrink: 0,
                background: `linear-gradient(135deg,${c1}22,${c2}22)`,
                border: `1px solid ${c1}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 72, fontWeight: 900, color: c1, letterSpacing: -2 }}>
                  {brandName.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}

            {/* Right: text content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minWidth: 0 }}>
              {/* Label */}
              <div style={{ fontSize: 13, color: c1, letterSpacing: 5, textTransform: 'uppercase', fontWeight: 700 }}>
                SocialPro · Sorteo
              </div>

              {/* Title */}
              <div style={{
                fontSize: titleSize, fontWeight: 900, color: '#ffffff',
                lineHeight: 1.05, letterSpacing: -1, textTransform: 'uppercase',
                overflow: 'hidden',
              }}>
                {title}
              </div>

              {/* Value badge */}
              {value && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, marginTop: 4,
                }}>
                  <div style={{
                    padding: '6px 18px', borderRadius: 100,
                    background: `linear-gradient(90deg,${c1},${c2})`,
                    fontSize: 22, fontWeight: 900, color: 'white', letterSpacing: 1,
                  }}>
                    {value}
                  </div>
                </div>
              )}

              {/* Brand + talent */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
                <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                  {brandName}
                </span>
                {talentName && (
                  <>
                    <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 14 }}>·</span>
                    <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.30)', fontWeight: 500 }}>
                      con {talentName}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '0 72px 24px 80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)', letterSpacing: 2 }}>
              socialpro.es/giveaways{talentSlug ? ` · ${talentSlug}` : ''}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.12)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>
              SocialPro
            </div>
          </div>

          {/* Gradient bottom bar */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${c1},${c2})` }} />
        </div>
      ),
      { ...SIZE },
    );
  } catch (err) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return new Response(`GIVEAWAY_OG_ERROR\n\n${msg}`, {
      status: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }
}
