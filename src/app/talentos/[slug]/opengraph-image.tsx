import { ImageResponse } from 'next/og';
import { SITE_URL } from '@/lib/site-url';
import type { OgTalentData } from '@/app/api/og/talent/[slug]/route';

export const runtime     = 'edge';
export const size        = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Props = { params: Promise<{ slug: string }> };

export default async function OgImage({ params }: Props) {
  const { slug } = await params;

  let talent: OgTalentData | null = null;
  try {
    const res = await fetch(`${SITE_URL}/api/og/talent/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) talent = await res.json() as OgTalentData;
  } catch { /* fallback below */ }

  if (!talent) {
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', background: '#050507', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: 'linear-gradient(90deg,#f5632a,#8b3aad)' }} />
          <div style={{ fontSize: 52, fontWeight: 900, color: '#f5632a', fontFamily: 'sans-serif' }}>SocialPro</div>
          <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.4)', fontFamily: 'sans-serif', marginTop: 16 }}>Creador de contenido gaming</div>
        </div>
      ),
      { ...size },
    );
  }

  const c1 = talent.gradientC1 || '#f5632a';
  const c2 = talent.gradientC2 || '#8b3aad';

  // Convertir URL relativa en absoluta — Satori requiere URLs absolutas
  const photoSrc = talent.photoUrl
    ? talent.photoUrl.startsWith('http')
      ? talent.photoUrl
      : `${SITE_URL}${talent.photoUrl}`
    : null;

  const metaParts: string[] = [];
  if (talent.codeCount > 0) metaParts.push(`${talent.codeCount} ${talent.codeCount === 1 ? 'código activo' : 'códigos activos'}`);
  if (talent.activeGiveawayCount > 0) metaParts.push(`${talent.activeGiveawayCount} sorteo${talent.activeGiveawayCount !== 1 ? 's' : ''} live`);
  const metaLine = metaParts.join(' · ');

  const nameSize = talent.name.length > 14 ? 64 : talent.name.length > 10 ? 76 : 88;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#050507',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top gradient bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: `linear-gradient(90deg,${c1},${c2})` }} />

        {/* Left color accent strip */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(180deg,${c1},${c2})` }} />

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 56, padding: '56px 72px 56px 80px' }}>

          {/* Avatar */}
          {photoSrc ? (
            <img
              src={photoSrc}
              width={200}
              height={200}
              style={{ borderRadius: 16, objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 200, height: 200, borderRadius: 16, flexShrink: 0,
              background: `linear-gradient(135deg,${c1},${c2})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 72, fontWeight: 900, color: 'white' }}>{talent.initials}</span>
            </div>
          )}

          {/* Text */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
            {/* SocialPro label */}
            <div style={{ fontSize: 14, color: c1, letterSpacing: 4, textTransform: 'uppercase', fontWeight: 700 }}>
              SocialPro · Creador
            </div>

            {/* Name */}
            <div style={{ fontSize: nameSize, fontWeight: 900, color: '#ffffff', lineHeight: 1, letterSpacing: -1, textTransform: 'uppercase' }}>
              {talent.name}
            </div>

            {/* Role · Game */}
            <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
              {[talent.role, talent.game].filter(Boolean).join(' · ')}
            </div>

            {/* Live badge */}
            {metaLine && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: '#C3FC00' }} />
                <div style={{ fontSize: 18, color: '#C3FC00', fontWeight: 700 }}>
                  {metaLine}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '0 72px 28px 80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>
            socialpro.es/talentos/{slug}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.15)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>
            SocialPro
          </div>
        </div>

        {/* Bottom gradient bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${c1},${c2})` }} />
      </div>
    ),
    { ...size },
  );
}
