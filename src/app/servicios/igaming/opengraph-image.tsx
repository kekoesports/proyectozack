import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Agencia iGaming Influencers — SocialPro';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#06080f', fontFamily: 'sans-serif', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: 'linear-gradient(90deg,#f5632a,#e03070,#c42880,#8b3aad)' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '-5%', width: 450, height: 450, borderRadius: '50%', background: 'rgba(139,58,173,0.07)', filter: 'blur(80px)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <div style={{ fontSize: 16, color: 'rgba(139,58,173,0.9)', letterSpacing: '5px', textTransform: 'uppercase', fontWeight: 700 }}>SocialPro</div>
          <div style={{ fontSize: 58, fontWeight: 900, color: '#ffffff', letterSpacing: '-1px', textAlign: 'center', lineHeight: 1.1 }}>
            AGENCIA <span style={{ color: '#8b3aad' }}>iGAMING</span>
          </div>
          <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.45)', letterSpacing: '3px', textTransform: 'uppercase' }}>DGOJ Compliance · FTD Tracking</div>
          <div style={{ display: 'flex', gap: 36, marginTop: 20, padding: '16px 32px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {[{ v: '340+', l: 'FTDs activación' }, { v: '<72h', l: 'Activación' }, { v: '13+', l: 'Años' }].map(s => (
              <div key={s.l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 30, fontWeight: 800, color: '#8b3aad' }}>{s.v}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '1px' }}>{s.l}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 28, fontSize: 16, color: 'rgba(255,255,255,0.2)', letterSpacing: '1px' }}>socialpro.es</div>
      </div>
    ),
    { ...size },
  );
}
