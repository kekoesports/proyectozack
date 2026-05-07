import { ImageResponse } from 'next/og';

export const runtime     = 'edge';
export const size        = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Props = { params: Promise<{ slug: string }> };

const BRAND_GRADIENT = 'linear-gradient(90deg,#f5632a,#e03070,#c42880,#8b3aad)';

export default async function OgImage({ params }: Props) {
  const { slug } = await params;

  // Formatear el slug como nombre de display
  const displayName = slug.toUpperCase().replace(/-/g, ' ');
  const nameSize = displayName.length > 14 ? 64 : displayName.length > 10 ? 76 : 88;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', background: '#050507', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>

        {/* Top gradient bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: BRAND_GRADIENT }} />

        {/* Left accent */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'linear-gradient(180deg,#f5632a,#8b3aad)' }} />

        {/* Background X logo */}
        <div style={{
          position: 'absolute', right: 60, top: '50%',
          fontSize: 480, fontWeight: 900, color: 'rgba(255,255,255,0.03)',
          lineHeight: 1, transform: 'translateY(-50%)',
        }}>✕</div>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '56px 80px' }}>
          <div style={{ fontSize: 15, color: '#f5632a', letterSpacing: 5, textTransform: 'uppercase', fontWeight: 700, marginBottom: 20 }}>
            SocialPro · Creador de Contenido
          </div>

          <div style={{ fontSize: nameSize, fontWeight: 900, color: '#ffffff', lineHeight: 1, letterSpacing: -1, textTransform: 'uppercase', marginBottom: 20 }}>
            {displayName}
          </div>

          <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.4)', fontWeight: 500, marginBottom: 32 }}>
            Gaming &amp; Esports · España y LatAm
          </div>

          {/* Pills */}
          <div style={{ display: 'flex', gap: 12 }}>
            {['Códigos exclusivos', 'Sorteos activos', 'CS2 · iGaming'].map((label) => (
              <div key={label} style={{ padding: '8px 18px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '0 80px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>socialpro.es/talentos/{slug}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.15)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>SocialPro</div>
        </div>

        {/* Bottom bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: BRAND_GRADIENT }} />
      </div>
    ),
    { ...size },
  );
}
