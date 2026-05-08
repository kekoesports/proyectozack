import { ImageResponse } from 'next/og';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Satori does not support 8-digit hex colors (#rrggbbaa). Convert to rgba().
function ha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const W = 1200;
const H = 630;

// Category → accent color (hex, matches Tailwind palette in blog utils)
const CAT_COLORS: Record<string, string> = {
  'caso-exito': '#f5632a',
  'igaming':    '#8b3aad',
  'guia':       '#5b9bd5',
  'tendencias': '#10b981',
  'youtube':    '#ef4444',
  'esports':    '#60a5fa',
  'noticias':   '#e03070',
};

const CAT_LABELS: Record<string, string> = {
  'caso-exito': 'Caso de Éxito',
  'igaming':    'iGaming',
  'guia':       'Guía',
  'tendencias': 'Tendencias',
  'youtube':    'YouTube',
  'esports':    'Esports',
  'noticias':   'Noticias',
};

// Inline category derivation (mirrors src/lib/utils/blog.ts — kept independent of client utils)
function deriveSlugCategory(slug: string, title: string): string {
  const s = slug.toLowerCase();
  const t = title.toLowerCase();
  if (s.includes('activacion') || s.includes('anatomia') || t.includes('×') ||
      (s.includes('socialpro') && (s.includes('razer') || s.includes('1win') || s.includes('skinsmonkey') || s.includes('keydrop'))))
    return 'caso-exito';
  if (s.includes('igaming') || s.includes('casino') || s.includes('dgoj') || s.includes('apuestas'))
    return 'igaming';
  if (s.includes('guia') || s.includes('como-') || s.includes('conseguir') || s.includes('monetizar') || s.includes('elegir'))
    return 'guia';
  if (s.includes('youtube') || s.includes('streamer') || s.includes('twitch') || s.includes('streaming'))
    return 'youtube';
  if (s.includes('tendencia') || s.includes('latam') || s.includes('-2025') || s.includes('-2026'))
    return 'tendencias';
  if (s.includes('esports') || s.includes('cs2') || s.includes('gaming-hardware'))
    return 'esports';
  return 'noticias';
}

function readTimeFromBodyMd(bodyMd: string): number {
  return Math.max(1, Math.ceil(bodyMd.trim().split(/\s+/).length / 200));
}

// Truncate title to fit cleanly in the OG image — max ~70 chars for large sizes
function truncateTitle(title: string, maxLen: number): string {
  if (title.length <= maxLen) return title;
  return title.slice(0, maxLen - 1).trimEnd() + '…';
}

// Dynamic font size: shorter titles = bigger, matches brand "typography is energy"
function titleFontSize(title: string): number {
  const len = title.length;
  if (len <= 28) return 80;
  if (len <= 42) return 66;
  if (len <= 58) return 54;
  if (len <= 72) return 44;
  return 36;
}

// Cache Barlow Condensed 900 for the lifetime of the lambda instance
let _font: ArrayBuffer | null = null;

async function loadBarlowFont(): Promise<ArrayBuffer | null> {
  if (_font) return _font;
  try {
    // Legacy UA → Google Fonts returns TTF format (required by Satori/ImageResponse)
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@900&display=swap',
      {
        headers: { 'User-Agent': 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1)' },
        signal: AbortSignal.timeout(2000),
      },
    ).then((r) => r.text());

    const url = css.match(/url\(([^)]+)\)/)?.[1];
    if (!url) {
      console.warn('[og/blog] Barlow: no font URL in Google Fonts CSS');
      return null;
    }

    _font = await fetch(url, { signal: AbortSignal.timeout(2000) }).then((r) => r.arrayBuffer());
    return _font;
  } catch (err) {
    console.warn('[og/blog] Barlow font load failed — falling back to system font', err);
    return null;
  }
}

// Fetch cover image and encode as base64 data URI (same pattern as talent-img)
async function fetchCoverBase64(coverUrl: string): Promise<string | null> {
  try {
    const src = coverUrl.startsWith('http') ? coverUrl : `https://socialpro.es${coverUrl}`;
    const res = await fetch(src, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const mime = res.headers.get('content-type') ?? 'image/jpeg';
    return `data:${mime};base64,${Buffer.from(buf).toString('base64')}`;
  } catch {
    return null;
  }
}

// Generic SocialPro-branded OG — used when slug not found or on critical error
async function genericFallbackResponse(fontData: ArrayBuffer | null): Promise<Response> {
  const accent = '#f5632a';
  const imgResp = new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', background: '#050507', display: 'flex', flexDirection: 'column', fontFamily: fontData ? 'Barlow' : 'sans-serif' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: accent }} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 20, color: accent, letterSpacing: 6, fontWeight: 700, textTransform: 'uppercase' }}>SocialPro</div>
          <div style={{ fontSize: 52, fontWeight: 900, color: '#ffffff', textTransform: 'uppercase', letterSpacing: -1 }}>Gaming &amp; Esports</div>
          <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.35)', letterSpacing: 2 }}>socialpro.es</div>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: accent }} />
      </div>
    ),
    { width: W, height: H, ...(fontData ? { fonts: [{ name: 'Barlow', data: fontData, weight: 900, style: 'normal' }] } : {}) },
  );
  const bytes = await imgResp.arrayBuffer();
  return new Response(bytes, { headers: { 'Content-Type': 'image/png' } });
}

export async function GET(req: Request) {
  let fontData: ArrayBuffer | null = null;

  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug') ?? '';

    // Parallel: font + post data
    const [loadedFont, postRows] = await Promise.all([
      loadBarlowFont(),
      slug
        ? db.$client`SELECT title, excerpt, author, cover_url, body_md FROM posts WHERE slug = ${slug} LIMIT 1`
        : Promise.resolve([]),
    ]);

    fontData = loadedFont;
    const post = postRows[0];

    // Slug not found — return generic branded fallback (not 500)
    if (!post) return genericFallbackResponse(fontData);

  const postTitle   = String(post.title   ?? '');
  const postExcerpt = post.excerpt  ? String(post.excerpt)    : null;
  const postAuthor  = post.author   ? String(post.author)     : 'SocialPro';
  const postCoverUrl= post.cover_url ? String(post.cover_url) : null;
  const postBodyMd  = post.body_md  ? String(post.body_md)    : '';

  const catSlug   = deriveSlugCategory(slug, postTitle);
  const accent    = CAT_COLORS[catSlug]  ?? '#e03070';
  const catLabel  = CAT_LABELS[catSlug]  ?? 'Blog';
  const mins      = readTimeFromBodyMd(postBodyMd);
  const titleText = truncateTitle(postTitle.toUpperCase(), 72);
  const fontSize  = titleFontSize(titleText);
  const fontConfig = fontData
    ? [{ name: 'Barlow', data: fontData, weight: 900 as const, style: 'normal' as const }]
    : [];
  const fontFamily = fontData ? 'Barlow' : 'sans-serif';

  // Cover image as background (optional — graceful null on failure)
  const coverBase64 = postCoverUrl ? await fetchCoverBase64(postCoverUrl) : null;

  const imgResp = new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          background: '#050507',
          display: 'flex', flexDirection: 'column',
          fontFamily,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Cover image as faded background — only if available */}
        {coverBase64 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverBase64}
            alt=""
            style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%',
              objectFit: 'cover', opacity: 0.14,
            }}
          />
        )}

        {/* Category radial glow */}
        <div
          style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse 65% 55% at 15% 55%, ${ha(accent,0.10)}, transparent 65%)`,
          }}
        />

        {/* Right-side dark vignette for text contrast */}
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(100deg, transparent 30%, #050507cc 75%, #050507 100%)',
          }}
        />

        {/* Top accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: accent }} />

        {/* Left accent line */}
        <div
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
            background: `linear-gradient(180deg, ${accent}, transparent 80%)`,
          }}
        />

        {/* Main content */}
        <div
          style={{
            position: 'relative',
            flex: 1,
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center',
            padding: '62px 80px 50px 80px',
            gap: 0,
          }}
        >
          {/* Category pill */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                background: ha(accent, 0.13),
                border: `1px solid ${ha(accent,0.33)}`,
                borderRadius: 4,
                padding: '4px 12px',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 4,
                textTransform: 'uppercase',
                color: accent,
              }}
            >
              {catLabel}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', letterSpacing: 3 }}>
              SocialPro
            </div>
          </div>

          {/* Title — Barlow Condensed 900, uppercase */}
          <div
            style={{
              fontSize,
              fontWeight: 900,
              color: '#ffffff',
              lineHeight: 1.05,
              letterSpacing: -1,
              textTransform: 'uppercase',
              maxWidth: '88%',
              display: 'flex',
            }}
          >
            {titleText}
          </div>

          {/* Excerpt — 1 line, muted */}
          {postExcerpt && (
            <div
              style={{
                fontSize: 19,
                color: 'rgba(255,255,255,0.40)',
                marginTop: 22,
                fontWeight: 400,
                maxWidth: '72%',
                lineHeight: 1.4,
                display: 'flex',
              }}
            >
              {postExcerpt.length > 90 ? `${postExcerpt.slice(0, 88)}…` : postExcerpt}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 80px 32px',
          }}
        >
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.28)', letterSpacing: 2 }}>
            {postAuthor}  ·  {mins} min lectura
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.18)',
              letterSpacing: 4,
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            socialpro.es
          </div>
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, ${accent}, transparent 60%)`,
          }}
        />
      </div>
    ),
    {
      width: W,
      height: H,
      ...(fontConfig.length > 0 ? { fonts: fontConfig } : {}),
    },
  );
  const imgBytes = await imgResp.arrayBuffer();
  return new Response(imgBytes, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' },
  });
  } catch (err) {
    console.error('[og/blog] Unhandled error — returning generic fallback', err);
    return genericFallbackResponse(fontData);
  }
}
