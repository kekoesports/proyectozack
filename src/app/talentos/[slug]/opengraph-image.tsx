import { ImageResponse } from 'next/og';

export const runtime     = 'edge';
export const size        = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Props = { params: Promise<{ slug: string }> };

export default async function OgImage({ params }: Props) {
  const { slug } = await params;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#050507',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          gap: 20,
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: 'linear-gradient(90deg,#f5632a,#8b3aad)' }} />
        <div style={{ fontSize: 18, color: '#f5632a', letterSpacing: 4, textTransform: 'uppercase', fontWeight: 700 }}>SocialPro · Creador</div>
        <div style={{ fontSize: 80, fontWeight: 900, color: '#ffffff', textTransform: 'uppercase', letterSpacing: -2 }}>{slug.toUpperCase()}</div>
        <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.4)' }}>Streaming & Gaming · socialpro.es</div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#f5632a,#8b3aad)' }} />
      </div>
    ),
    { ...size },
  );
}
