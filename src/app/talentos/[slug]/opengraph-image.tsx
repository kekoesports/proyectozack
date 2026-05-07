import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SocialPro — Perfil de Creador';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Props = { params: Promise<{ slug: string }> };

export default async function OgImage({ params }: Props) {
  const { slug } = await params;
  const name = slug.toUpperCase().replace(/-/g, ' ');
  const fs = name.length > 14 ? 64 : name.length > 10 ? 76 : 90;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', background: '#050507', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: 'linear-gradient(90deg,#f5632a,#e03070,#c42880,#8b3aad)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 15, color: '#f5632a', letterSpacing: 5, textTransform: 'uppercase', fontWeight: 700 }}>SocialPro · Creador</div>
          <div style={{ fontSize: fs, fontWeight: 900, color: '#ffffff', letterSpacing: -2, textTransform: 'uppercase', textAlign: 'center' }}>{name}</div>
          <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.4)', letterSpacing: 2 }}>Gaming &amp; Esports</div>
        </div>
        <div style={{ position: 'absolute', bottom: 28, fontSize: 14, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>socialpro.es</div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#f5632a,#8b3aad)' }} />
      </div>
    ),
    { ...size },
  );
}
