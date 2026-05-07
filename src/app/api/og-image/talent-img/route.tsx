import { ImageResponse } from 'next/og';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { talents } from '@/db/schema/talents';

export const runtime = 'nodejs';

const SIZE = { width: 1200, height: 630 };

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug') ?? '';

    let name = slug ? slug.toUpperCase().replace(/-/g, ' ') : 'CREADOR';
    let role = '', game = '', initials = name.slice(0, 2);
    let photoSrc: string | null = null;
    let c1 = '#f5632a', c2 = '#8b3aad';

    if (slug) {
      try {
        const talentRows = await db.select({
          name: talents.name, role: talents.role, game: talents.game,
          initials: talents.initials, photoUrl: talents.photoUrl,
          gradientC1: talents.gradientC1, gradientC2: talents.gradientC2,
        }).from(talents).where(eq(talents.slug, slug)).limit(1);

        const t = talentRows[0];
        if (t) {
          name     = t.name;
          role     = t.role;
          game     = t.game;
          initials = t.initials;
          c1       = t.gradientC1;
          c2       = t.gradientC2;
          if (t.photoUrl) {
            const rawUrl = t.photoUrl.startsWith('http')
              ? t.photoUrl
              : `https://socialpro.es${t.photoUrl}`;
            try {
              const imgRes = await fetch(rawUrl);
              if (imgRes.ok) {
                const buf = await imgRes.arrayBuffer();
                const b64 = Buffer.from(buf).toString('base64');
                const mime = imgRes.headers.get('content-type') ?? 'image/jpeg';
                photoSrc = `data:${mime};base64,${b64}`;
              }
            } catch { /* sin foto */ }
          }
        }
      } catch { /* fallback al slug */ }
    }

    const nameSize = name.length > 14 ? 64 : name.length > 10 ? 76 : 90;

    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', background: '#050507', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: `linear-gradient(90deg,${c1},${c2})` }} />
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(180deg,${c1},${c2})` }} />

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 56, padding: '56px 72px 56px 80px' }}>
            {photoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoSrc} width={200} height={200} style={{ borderRadius: 16, objectFit: 'cover', flexShrink: 0 }} alt={name} />
            ) : (
              <div style={{ width: 200, height: 200, borderRadius: 16, flexShrink: 0, background: `linear-gradient(135deg,${c1},${c2})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 72, fontWeight: 900, color: 'white' }}>{initials.toUpperCase()}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
              <div style={{ fontSize: 14, color: c1, letterSpacing: 4, textTransform: 'uppercase', fontWeight: 700 }}>SocialPro · Creador</div>
              <div style={{ fontSize: nameSize, fontWeight: 900, color: '#ffffff', lineHeight: 1, letterSpacing: -1, textTransform: 'uppercase' }}>{name}</div>
              {(role || game) && (
                <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
                  {[role, game].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: '0 72px 28px 80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>socialpro.es/talentos/{slug}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.15)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>SocialPro</div>
          </div>

          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${c1},${c2})` }} />
        </div>
      ),
      { ...SIZE },
    );
  } catch (err) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}\n\n${err.stack ?? ''}` : String(err);
    return new Response(`OG_ERROR\n\n${msg}`, {
      status: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }
}
