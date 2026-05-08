import { ImageResponse } from 'next/og';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { posts } from '@/db/schema';

export const runtime = 'nodejs';

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
function genericFallbackResponse(fontData: ArrayBuffer | null) {
  const accent = '#f5632a';
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', background: '#050507', display: 'flex', flexDirection: 'column', fontFamily: fontData ? 'Barlow' : 'sans-serif' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: accent }} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 20, color: accent, letterSpacing: 6, fontWeight: 700, textTransform: 'uppercase' }}>SocialPro</div>
          <div style={{ fontSize: 52, fontWeight: 900, color: '#ffffff', textTransform: 'uppercase', letterSpacing: -1 }}>Gaming & Esports</div>
          <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.35)', letterSpacing: 2 }}>socialpro.es</div>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: accent }} />
      </div>
    ),
    { width: W, height: H, ...(fontData ? { fonts: [{ name: 'Barlow', data: fontData, weight: 900, style: 'normal' }] } : {}) },
  );
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug') ?? '';

  // Parallel: font + post data
  const [fontData, postRows] = await Promise.all([
    loadBarlowFont(),
    slug
      ? db.select({
          title:   posts.title,
          excerpt: posts.excerpt,
          author:  posts.author,
          coverUrl: posts.coverUrl,
          bodyMd:  posts.bodyMd,
        }).from(posts).where(eq(posts.slug, slug)).limit(1)
      : Promise.resolve([]),
  ]);

  const post = postRows[0];

  // Slug not found — return generic branded fallback (not 500)
  if (!post) return genericFallbackResponse(fontData);

  const catSlug   = deriveSlugCategory(slug, post.title);
  const accent    = CAT_COLORS[catSlug]  ?? '#e03070';
  const catLabel  = CAT_LABELS[catSlug]  ?? 'Blog';
  const mins      = readTimeFromBodyMd(post.bodyMd ?? '');
  const titleText = truncateTitle(post.title.toUpperCase(), 72);
  const fontSize  = titleFontSize(titleText);
  const fontConfig = fontData
    ? [{ name: 'Barlow', data: fontData, weight: 900 as const, style: 'normal' as const }]
    : [];
  const fontFamily = fontData ? 'Barlow' : 'sans-serif';

  // Cover image as background (optional — graceful null on failure)
  const coverBase64 = post.coverUrl ? await fetchCoverBase64(post.coverUrl) : null;

  const response = new ImageResponse(
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
            background: `radial-gradient(ellipse 65% 55% at 15% 55%, ${accent}1a, transparent 65%)`,
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
                background: `${accent}22`,
                border: `1px solid ${accent}55`,
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
          {post.excerpt && (
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
              {post.excerpt.length > 90 ? `${post.excerpt.slice(0, 88)}…` : post.excerpt}
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
            {post.author}  ·  {mins} min lectura
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

  // Cache aggressively — OG images change only when post content changes (revalidated by ISR)
  response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  return response;
}
