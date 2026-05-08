import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Agencia Gaming LATAM — SocialPro';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#050a08', fontFamily: 'sans-serif', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: 'linear-gradient(90deg,#f5632a,#e03070,#c42880,#8b3aad)' }} />
        <div style={{ position: 'absolute', top: '15%', right: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(245,99,42,0.05)', filter: 'blur(70px)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <div style={{ fontSize: 16, color: 'rgba(245,99,42,0.8)', letterSpacing: '5px', textTransform: 'uppercase', fontWeight: 700 }}>SocialPro</div>
          <div style={{ fontSize: 60, fontWeight: 900, color: '#ffffff', letterSpacing: '-1px', textAlign: 'center', lineHeight: 1.1 }}>
            GAMING <span style={{ color: '#e03070' }}>LATAM</span>
          </div>
          <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.45)', letterSpacing: '2px', textTransform: 'uppercase' }}>México · Argentina · Colombia · Chile</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            {['🇲🇽', '🇦🇷', '🇨🇴', '🇨🇱', '🇵🇪'].map(f => (
              <span key={f} style={{ fontSize: 36 }}>{f}</span>
            ))}
          </div>
          <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.3)', letterSpacing: '1px', marginTop: 8 }}>300M+ hispanohablantes · 13+ años de experiencia</div>
        </div>
        <div style={{ position: 'absolute', bottom: 28, fontSize: 16, color: 'rgba(255,255,255,0.2)', letterSpacing: '1px' }}>socialpro.es</div>
      </div>
    ),
    { ...size },
  );
}
