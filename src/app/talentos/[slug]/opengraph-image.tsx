import { ImageResponse } from 'next/og';
import { SITE_URL } from '@/lib/site-url';
import type { OgTalentData } from '@/app/api/og/talent/[slug]/route';

export const runtime     = 'edge';
export const size        = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Props = { params: Promise<{ slug: string }> };

export default async function OgImage({ params }: Props) {
  const { slug } = await params;

  // Fetch data from internal API (edge-safe pattern)
  let talent: OgTalentData | null = null;
  try {
    const res = await fetch(`${SITE_URL}/api/og/talent/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) talent = await res.json() as OgTalentData;
  } catch { /* fallback below */ }

  // Fallback genérico si no hay datos
  if (!talent) {
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', background: '#050507', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: 'linear-gradient(90deg,#f5632a,#8b3aad)' }} />
          <div style={{ fontSize: 48, fontWeight: 900, color: '#f5632a' }}>SocialPro</div>
          <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.4)', letterSpacing: 3 }}>Creador de contenido gaming</div>
        </div>
      ),
      { ...size },
    );
  }

  const c1 = talent.gradientC1 || '#f5632a';
  const c2 = talent.gradientC2 || '#8b3aad';

  const metaParts: string[] = [];
  if (talent.codeCount > 0) metaParts.push(`${talent.codeCount} ${talent.codeCount === 1 ? 'código activo' : 'códigos activos'}`);
  if (talent.activeGiveawayCount > 0) metaParts.push(`${talent.activeGiveawayCount} ${talent.activeGiveawayCount === 1 ? 'sorteo' : 'sorteos'} live`);
  const metaLine = metaParts.join(' · ');

  const nameSize = talent.name.length > 14 ? 68 : talent.name.length > 10 ? 80 : 92;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          background: '#050507',
          display: 'flex', flexDirection: 'column',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Gradient bar top */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: `linear-gradient(90deg,${c1},${c2})` }} />

        {/* Ambient glow */}
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 600, height: 600, borderRadius: '50%', background: `${c1}18`, filter: 'blur(100px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: 500, height: 500, borderRadius: '50%', background: `${c2}14`, filter: 'blur(80px)' }} />

        {/* Main content row */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 56, padding: '56px 72px' }}>

          {/* Avatar */}
          {talent.photoUrl ? (
            <img
              src={talent.photoUrl}
              width={200}
              height={200}
              style={{
                borderRadius: 20,
                objectFit: 'cover',
                border: `3px solid ${c1}70`,
                flexShrink: 0,
              }}
            />
          ) : (
            <div style={{
              width: 200, height: 200, borderRadius: 20, flexShrink: 0,
              background: `linear-gradient(135deg,${c1},${c2})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 72, fontWeight: 900, color: 'white' }}>{talent.initials}</span>
            </div>
          )}

          {/* Text block */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
            {/* Label */}
            <div style={{ fontSize: 13, color: `${c1}bb`, letterSpacing: 5, textTransform: 'uppercase', fontWeight: 700 }}>
              SocialPro · Creador
            </div>

            {/* Name */}
            <div style={{ fontSize: nameSize, fontWeight: 900, color: '#ffffff', lineHeight: 1, letterSpacing: -2, textTransform: 'uppercase' }}>
              {talent.name}
            </div>

            {/* Role · Game */}
            <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.42)', fontWeight: 600, letterSpacing: 0.5 }}>
              {[talent.role, talent.game].filter(Boolean).join(' · ')}
            </div>

            {/* Active content badge */}
            {metaLine && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: '#C3FC00' }} />
                <div style={{ fontSize: 19, color: '#C3FC00', fontWeight: 700 }}>
                  {metaLine}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '0 72px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.18)', letterSpacing: 2 }}>
            socialpro.es/talentos/{slug}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.14)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>
            SocialPro
          </div>
        </div>

        {/* Gradient bar bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${c1},${c2})` }} />
      </div>
    ),
    { ...size },
  );
}
