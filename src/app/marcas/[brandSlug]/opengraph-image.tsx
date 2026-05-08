import { ImageResponse } from 'next/og';
import { getBrandBySlug } from '@/lib/brands';
import { getAllCodes } from '@/lib/queries/creatorCodes';
import { getAllActiveGiveaways } from '@/lib/queries/giveawaysHub';

// Node.js runtime — necesario para Drizzle/Neon
export const runtime     = 'nodejs';
export const size        = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Props = { params: Promise<{ brandSlug: string }> };

export default async function OgImage({ params }: Props) {
  const { brandSlug } = await params;
  const brand = getBrandBySlug(brandSlug);

  if (!brand) {
    return new ImageResponse(
      <div style={{ width: '100%', height: '100%', background: '#050507', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#f5632a', fontSize: 48, fontWeight: 900 }}>SocialPro</span>
      </div>,
      { ...size },
    );
  }

  const [allCodes, allGiveaways] = await Promise.all([
    getAllCodes(),
    getAllActiveGiveaways(),
  ]);

  const codeCount     = allCodes.filter((c) => c.brandName.toLowerCase() === brand.dbName.toLowerCase()).length;
  const giveawayCount = allGiveaways.filter((g) => g.brandName.toLowerCase() === brand.dbName.toLowerCase()).length;

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
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: 'linear-gradient(90deg,#f5632a,#e03070,#c42880,#8b3aad)' }} />

        {/* Ambient glow */}
        <div style={{ position: 'absolute', top: '-10%', left: '20%', width: 600, height: 600, borderRadius: '50%', background: 'rgba(245,99,42,0.08)', filter: 'blur(100px)' }} />
        <div style={{ position: 'absolute', bottom: '-5%', right: '10%', width: 500, height: 500, borderRadius: '50%', background: 'rgba(139,58,173,0.08)', filter: 'blur(80px)' }} />

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '60px 72px' }}>
          {/* SocialPro label */}
          <div style={{ fontSize: 13, color: 'rgba(245,99,42,0.7)', letterSpacing: 6, textTransform: 'uppercase', fontWeight: 700 }}>
            SocialPro · Códigos Exclusivos
          </div>

          {/* Brand name — big */}
          <div style={{ fontSize: 96, fontWeight: 900, color: '#ffffff', letterSpacing: -4, textAlign: 'center', lineHeight: 1, textTransform: 'uppercase' }}>
            {brand.name}
          </div>

          {/* Tagline */}
          <div style={{ fontSize: 26, color: 'rgba(255,255,255,0.45)', textAlign: 'center', letterSpacing: 1 }}>
            {brand.tagline}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 48, marginTop: 12 }}>
            {codeCount > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 40, fontWeight: 900, color: '#f5632a' }}>{codeCount}</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase' }}>
                  {codeCount === 1 ? 'Código' : 'Códigos'}
                </span>
              </div>
            )}
            {giveawayCount > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 40, fontWeight: 900, color: '#C3FC00' }}>{giveawayCount}</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase' }}>
                  {giveawayCount === 1 ? 'Sorteo live' : 'Sorteos live'}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 40, fontWeight: 900, color: 'rgba(255,255,255,0.5)' }}>2026</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase' }}>Bonos activos</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '0 72px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>socialpro.es/marcas/{brandSlug}</div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.15)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>SocialPro</div>
        </div>

        {/* Gradient bar bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#f5632a,#e03070,#c42880,#8b3aad)' }} />
      </div>
    ),
    { ...size },
  );
}
