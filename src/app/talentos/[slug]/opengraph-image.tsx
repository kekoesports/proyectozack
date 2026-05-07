import { ImageResponse } from 'next/og';
import { getTalentBySlug } from '@/lib/queries/talents';
import { getCodesByTalent } from '@/lib/queries/creatorCodes';
import { getActiveGiveaways } from '@/lib/queries/giveaways';

// Node.js runtime — necesario para Drizzle/Neon
export const runtime = 'nodejs';
export const size    = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Props = { params: Promise<{ slug: string }> };

export default async function OgImage({ params }: Props) {
  const { slug } = await params;

  const talent = await getTalentBySlug(slug);

  if (!talent) {
    // Fallback genérico
    return new ImageResponse(
      <div style={{ width: '100%', height: '100%', background: '#050507', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#f5632a', fontSize: 48, fontWeight: 900 }}>SocialPro</span>
      </div>,
      { ...size },
    );
  }

  const [codes, active] = await Promise.all([
    getCodesByTalent(talent.id),
    getActiveGiveaways(talent.id),
  ]);

  const c1 = talent.gradientC1 || '#f5632a';
  const c2 = talent.gradientC2 || '#8b3aad';

  const metaLine = [
    codes.length > 0   ? `${codes.length} ${codes.length === 1 ? 'código' : 'códigos'} activo${codes.length !== 1 ? 's' : ''}` : null,
    active.length > 0  ? `${active.length} sorteo${active.length !== 1 ? 's' : ''} en vivo` : null,
  ].filter(Boolean).join(' · ');

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

        {/* Ambient glow from talent gradient */}
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 600, height: 600, borderRadius: '50%', background: `${c1}18`, filter: 'blur(100px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: 500, height: 500, borderRadius: '50%', background: `${c2}14`, filter: 'blur(80px)' }} />

        {/* Content row */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 60, padding: '60px 72px 60px 72px' }}>
          {/* Avatar */}
          {talent.photoUrl ? (
            <img
              src={talent.photoUrl}
              width={220}
              height={220}
              style={{ borderRadius: 24, objectFit: 'cover', border: `3px solid ${c1}60`, flexShrink: 0 }}
            />
          ) : (
            <div style={{ width: 220, height: 220, borderRadius: 24, background: `linear-gradient(135deg,${c1},${c2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 72, fontWeight: 900, color: 'white' }}>{talent.initials}</span>
            </div>
          )}

          {/* Text */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
            {/* SocialPro label */}
            <div style={{ fontSize: 14, color: `${c1}cc`, letterSpacing: 5, textTransform: 'uppercase', fontWeight: 700 }}>
              SocialPro · Creador
            </div>

            {/* Name */}
            <div style={{ fontSize: talent.name.length > 12 ? 72 : 88, fontWeight: 900, color: '#ffffff', lineHeight: 1, letterSpacing: -2, textTransform: 'uppercase' }}>
              {talent.name}
            </div>

            {/* Role · Game */}
            <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: 1 }}>
              {[talent.role, talent.game].filter(Boolean).join(' · ')}
            </div>

            {/* Meta */}
            {metaLine && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: '#C3FC00' }} />
                <div style={{ fontSize: 20, color: '#C3FC00', fontWeight: 700 }}>
                  {metaLine}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '0 72px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>socialpro.es/talentos/{slug}</div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.15)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>SocialPro</div>
        </div>

        {/* Gradient bar bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${c1},${c2})` }} />
      </div>
    ),
    { ...size },
  );
}
