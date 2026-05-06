import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Influencers CS2 España — SocialPro';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#050810', fontFamily: 'sans-serif', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: 'linear-gradient(90deg,#f5632a,#e03070,#c42880,#8b3aad)' }} />
        <div style={{ position: 'absolute', top: '20%', left: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'rgba(245,99,42,0.06)', filter: 'blur(80px)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ fontSize: 16, color: 'rgba(245,99,42,0.8)', letterSpacing: '5px', textTransform: 'uppercase', fontWeight: 700 }}>SocialPro</div>
          <div style={{ fontSize: 64, fontWeight: 900, color: '#ffffff', letterSpacing: '-2px', textAlign: 'center', lineHeight: 1.1 }}>
            INFLUENCERS <span style={{ color: '#f5632a' }}>CS2</span>
          </div>
          <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.5)', letterSpacing: '3px', textTransform: 'uppercase' }}>España y LatAm</div>
          <div style={{ display: 'flex', gap: 40, marginTop: 20 }}>
            {[{ v: '340+', l: 'FTDs' }, { v: '13+', l: 'Años' }, { v: '15M', l: 'Views/mes' }].map(s => (
              <div key={s.l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: '#f5632a' }}>{s.v}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', letterSpacing: '2px' }}>{s.l}</span>
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
