import { ImageResponse } from 'next/og';
import { db } from '@/lib/db';
import { safeFetchImageAsBase64 } from '@/lib/security/safeImageFetch';
import { getCaseConfig } from '@/features/cases/case-config';

export const dynamic = 'force-dynamic';

const SIZE = { width: 1200, height: 630 };

/** brand_name del DB → clave en CASE_CONFIG (keydrop, onewin, etc.) */
function brandToConfigKey(name: string): string {
  const lower = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (lower === '1win') return 'onewin';
  return lower;
}

/** brand_name → ruta local del logo en /public/images/brands/ */
const LOGO_PATH: Record<string, string> = {
  'RAZER':       '/images/brands/razer.png',
  '1WIN':        '/images/brands/1win.png',
  '1XBET':       '/images/brands/1xbet.png',
  'SKINSMONKEY': '/images/brands/skinsmonkey.png',
  'KEYDROP':     '/images/brands/keydrop.png',
  'HELLCASE':    '/images/brands/hellcase.png',
  'SKINPLACE':   '/images/brands/skinplace.png',
  'SKINCLUB':    '/images/brands/skinclub.png',
  'EMPIREDROP':  '/images/brands/empiredrop.png',
  'CLASHGG':     '/images/brands/clashgg.png',
  'JUGABET':     '/images/brands/jugabet.png',
  'PINUP':       '/images/brands/pinup.png',
  'PCCOMPONENTES': '/images/brands/pccomponentes.png',
  'EMMA':        '/images/brands/emma.png',
  'EVOPLAY':     '/images/brands/evoplay.png',
  'CSDROP':      '/images/brands/csdrop.png',
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug')?.trim() ?? '';

    let brandName = 'SocialPro';
    let title = 'Caso de Éxito';
    let logoSrc: string | null = null;
    let stats: { value: string; label: string }[] = [];

    if (slug) {
      try {
        const rows = await db.$client`
          SELECT brand_name, title, logo_url, reach, conversions, roi_multiplier
          FROM case_studies
          WHERE slug = ${slug}
          LIMIT 1
        `;
        const cs = rows[0];
        if (cs) {
          brandName = String(cs.brand_name ?? brandName);
          title     = String(cs.title ?? title);

          // 1. Stats desde case-config (más descriptivos que los campos genéricos del DB)
          const configKey = brandToConfigKey(brandName);
          const config    = getCaseConfig(configKey);
          if (config.stats.length > 0) {
            stats = config.stats.slice(0, 3);
          } else {
            // 2. Fallback: campos del DB
            stats = [
              cs.reach        ? { value: String(cs.reach),        label: 'Alcance' }      : null,
              cs.conversions  ? { value: String(cs.conversions),  label: 'Conversiones' } : null,
              cs.roi_multiplier ? { value: String(cs.roi_multiplier), label: 'ROI' }      : null,
            ].filter(Boolean) as { value: string; label: string }[];
          }

          // Logo: preferir ruta local → DB logo_url
          const localPath = LOGO_PATH[brandName.toUpperCase()];
          const logoUrl   = localPath
            ? `https://socialpro.es${localPath}`
            : (cs.logo_url ? String(cs.logo_url) : null);

          if (logoUrl) logoSrc = await safeFetchImageAsBase64(logoUrl);
        }
      } catch { /* fallback graceful */ }
    }

    const titleSize = title.length > 60 ? 26 : title.length > 40 ? 32 : 38;
    const C1 = '#f5632a';
    const C2 = '#8b3aad';

    const imgResp = new ImageResponse(
      (
        <div
          style={{
            width: '100%', height: '100%', background: '#080812',
            display: 'flex', flexDirection: 'column',
            fontFamily: 'sans-serif', position: 'relative',
          }}
        >
          {/* Gradient accent — top bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: `linear-gradient(90deg,${C1},#e03070,${C2})` }} />
          {/* Gradient accent — left bar */}
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(180deg,${C1},${C2})` }} />

          {/* Header strip — brand + tag */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '36px 64px 0 60px' }}>
            {/* Brand logo or name */}
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                height={52}
                style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)', maxWidth: 260 }}
                alt={brandName}
              />
            ) : (
              <span style={{ fontSize: 36, fontWeight: 900, color: 'white', letterSpacing: -1, textTransform: 'uppercase' }}>
                {brandName}
              </span>
            )}
            {/* "Caso de Éxito" tag */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              border: `1px solid rgba(245,99,42,0.4)`, borderRadius: 6,
              padding: '6px 14px',
            }}>
              <div style={{ width: 7, height: 7, borderRadius: 999, background: C1 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: C1, letterSpacing: 3, textTransform: 'uppercase' }}>
                Caso de Éxito
              </span>
            </div>
          </div>

          {/* Main content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px 64px 0 60px' }}>
            {/* eyebrow — template literal to avoid multi-child Satori error */}
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14 }}>
              {`${brandName} × SocialPro`}
            </div>
            {/* Title */}
            <div style={{
              fontSize: titleSize, fontWeight: 900, color: 'white',
              lineHeight: 1.1, letterSpacing: -0.5,
              textTransform: 'uppercase', maxWidth: 900,
            }}>
              {title}
            </div>
          </div>

          {/* Metrics row */}
          {stats.length > 0 && (
            <div style={{ display: 'flex', gap: 16, padding: '28px 64px 0 60px' }}>
              {stats.map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: 4,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10, padding: '16px 24px', minWidth: 160,
                  }}
                >
                  <span style={{
                    fontSize: 36, fontWeight: 900, lineHeight: 1,
                    background: `linear-gradient(90deg,${C1},${C2})`,
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                  }}>
                    {s.value}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '24px 64px 32px 60px',
          }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)', letterSpacing: 2 }}>
              {`socialpro.es/casos/${slug}`}
            </span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.12)', letterSpacing: 4, fontWeight: 700, textTransform: 'uppercase' }}>
              SocialPro
            </span>
          </div>

          {/* Bottom gradient bar */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${C1},#e03070,${C2})` }} />
        </div>
      ),
      { ...SIZE },
    );

    const bytes = await imgResp.arrayBuffer();
    return new Response(bytes, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}\n\n${err.stack ?? ''}` : String(err);
    return new Response(`OG_ERROR\n\n${msg}`, {
      status: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }
}
