/**
 * CategoryThumbnail — fallback editorial premium cuando un post no tiene coverUrl.
 *
 * Composición tipo magazine gaming (Dexerto / esports.gg / The Verge):
 *  - Gradiente multicapa por categoría
 *  - Patrón geométrico distintivo (lines/hex/grid/wave/play/dots)
 *  - Logo de marca cuando se detecta (Razer, 1WIN, SkinsMonkey, Keydrop, Hellcase, Skinplace)
 *  - Tipografía dominante (título en mayúsculas si no hay logo, sino branding)
 *  - Wordmark SocialPro discreto bottom-right
 *
 * Hook IA: cuando exista `cover_url` real en la BD, BlogCover usa la imagen.
 * Esta capa debe parecer un cover editorial, no un placeholder.
 *
 * @kind server
 */

import Image from 'next/image';
import type { BlogCategory } from '@/lib/utils/blog';
import { detectBrand } from '@/lib/utils/blog';

type Variant = 'card' | 'featured' | 'hero';

type Props = {
  readonly category: BlogCategory;
  readonly title: string;
  readonly brand?: string;
  readonly variant?: Variant;
};

type CategoryStyle = {
  readonly bg: string;
  readonly accent: string;
  readonly accentSoft: string;
  readonly glow: string;
  readonly pattern: 'lines' | 'hex' | 'dots' | 'wave' | 'play' | 'grid' | 'minimal';
};

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  'caso-exito': {
    bg: 'radial-gradient(ellipse 80% 60% at 30% 20%, rgba(245,99,42,0.08) 0%, transparent 55%), linear-gradient(135deg, #0c0303 0%, #2a0a02 35%, #4d1604 70%, #7c2209 100%)',
    accent: '#f5632a',
    accentSoft: 'rgba(245,99,42,0.16)',
    glow: 'rgba(245,99,42,0.30)',
    pattern: 'lines',
  },
  igaming: {
    bg: 'radial-gradient(ellipse 70% 60% at 70% 30%, rgba(139,58,173,0.12) 0%, transparent 60%), linear-gradient(135deg, #07020e 0%, #14062b 40%, #2a0a52 75%, #4a0d8a 100%)',
    accent: '#a855f7',
    accentSoft: 'rgba(168,85,247,0.18)',
    glow: 'rgba(139,58,173,0.35)',
    pattern: 'hex',
  },
  guia: {
    bg: 'radial-gradient(ellipse 70% 70% at 20% 80%, rgba(91,155,213,0.08) 0%, transparent 55%), linear-gradient(135deg, #020812 0%, #051a30 40%, #0a3461 75%, #155a8e 100%)',
    accent: '#60a5fa',
    accentSoft: 'rgba(96,165,250,0.16)',
    glow: 'rgba(91,155,213,0.30)',
    pattern: 'grid',
  },
  tendencias: {
    bg: 'radial-gradient(ellipse 80% 50% at 70% 70%, rgba(16,185,129,0.08) 0%, transparent 55%), linear-gradient(135deg, #010906 0%, #032213 40%, #064e36 75%, #0a7252 100%)',
    accent: '#34d399',
    accentSoft: 'rgba(52,211,153,0.16)',
    glow: 'rgba(16,185,129,0.30)',
    pattern: 'wave',
  },
  youtube: {
    bg: 'radial-gradient(ellipse 75% 60% at 30% 30%, rgba(239,68,68,0.08) 0%, transparent 55%), linear-gradient(135deg, #110203 0%, #2e0507 40%, #5e0c11 75%, #95141b 100%)',
    accent: '#f87171',
    accentSoft: 'rgba(239,68,68,0.16)',
    glow: 'rgba(239,68,68,0.30)',
    pattern: 'play',
  },
  esports: {
    bg: 'radial-gradient(ellipse 70% 60% at 50% 30%, rgba(59,130,246,0.08) 0%, transparent 55%), linear-gradient(135deg, #020610 0%, #08152e 40%, #122e5f 75%, #1d4a8b 100%)',
    accent: '#60a5fa',
    accentSoft: 'rgba(96,165,250,0.16)',
    glow: 'rgba(59,130,246,0.30)',
    pattern: 'dots',
  },
  noticias: {
    bg: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 45%, #2d2d2d 100%)',
    accent: '#e03070',
    accentSoft: 'rgba(224,48,112,0.14)',
    glow: 'rgba(224,48,112,0.22)',
    pattern: 'minimal',
  },
};

const FALLBACK_STYLE: CategoryStyle = {
  bg: 'linear-gradient(135deg, #0a0a0a, #2d2d2d)',
  accent: '#e03070',
  accentSoft: 'rgba(224,48,112,0.14)',
  glow: 'rgba(224,48,112,0.22)',
  pattern: 'minimal',
};

function PatternSvg({ kind, accent, id }: { kind: CategoryStyle['pattern']; accent: string; id: string }) {
  const stroke = accent;
  switch (kind) {
    case 'lines':
      return (
        <svg className="absolute inset-0 w-full h-full opacity-[0.08]" aria-hidden>
          <defs>
            <pattern id={id} width="56" height="56" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
              <line x1="0" y1="0" x2="0" y2="56" stroke={stroke} strokeWidth="0.7" />
              <line x1="14" y1="0" x2="14" y2="56" stroke={stroke} strokeWidth="0.4" opacity="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${id})`} />
        </svg>
      );
    case 'hex':
      return (
        <svg className="absolute inset-0 w-full h-full opacity-[0.10]" aria-hidden>
          <defs>
            <pattern id={id} width="48" height="42" patternUnits="userSpaceOnUse">
              <polygon points="24,2 44,14 44,30 24,42 4,30 4,14" fill="none" stroke={stroke} strokeWidth="0.7" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${id})`} />
        </svg>
      );
    case 'grid':
      return (
        <svg className="absolute inset-0 w-full h-full opacity-[0.07]" aria-hidden>
          <defs>
            <pattern id={id} width="36" height="36" patternUnits="userSpaceOnUse">
              <path d="M 36 0 L 0 0 0 36" fill="none" stroke={stroke} strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${id})`} />
        </svg>
      );
    case 'wave':
      return (
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.10]"
          aria-hidden
          viewBox="0 0 600 400"
          preserveAspectRatio="xMidYMid slice"
        >
          <path d="M0,260 Q150,200 300,240 T600,220 V400 H0 Z" fill={stroke} opacity="0.20" />
          <path d="M0,300 Q150,260 300,290 T600,280 V400 H0 Z" fill={stroke} opacity="0.30" />
        </svg>
      );
    case 'play':
      return (
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.06]"
          aria-hidden
          viewBox="0 0 600 400"
          preserveAspectRatio="xMidYMid slice"
        >
          <polygon points="240,140 240,260 340,200" fill={stroke} />
        </svg>
      );
    case 'dots':
      return (
        <svg className="absolute inset-0 w-full h-full opacity-[0.10]" aria-hidden>
          <defs>
            <pattern id={id} width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill={stroke} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${id})`} />
        </svg>
      );
    case 'minimal':
    default:
      return null;
  }
}

export function CategoryThumbnail({ category, title, brand, variant = 'card' }: Props) {
  const style = CATEGORY_STYLES[category.slug] ?? FALLBACK_STYLE;
  const patternId = `pat-${category.slug}-${variant}`;
  const detected = detectBrand(title, title);

  // Tamaños por variant — reglas editoriales
  const isHero = variant === 'hero';
  const isFeatured = variant === 'featured';

  return (
    <div
      className="absolute inset-0 flex overflow-hidden"
      style={{ background: style.bg }}
      aria-hidden
    >
      {/* Patrón geométrico de categoría */}
      <PatternSvg kind={style.pattern} accent={style.accent} id={patternId} />

      {/* Glow principal */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse ${detected ? '50% 45% at 50% 50%' : '60% 55% at 50% 65%'}, ${style.glow}, transparent 70%)`,
        }}
      />

      {/* Edge vignette — refuerzo cinemático */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 55%, rgba(0,0,0,0.45) 100%)' }}
      />

      {/* ── Capa principal: marca o tipografía editorial ─────────────── */}
      {detected ? (
        <BrandedComposition
          brand={detected}
          accent={style.accent}
          accentSoft={style.accentSoft}
          variant={variant}
        />
      ) : (
        <EditorialComposition
          title={title}
          category={category}
          accent={style.accent}
          variant={variant}
        />
      )}

      {/* ── Etiqueta de categoría top-left ───────────────────────────── */}
      <div className={`absolute ${isHero ? 'top-5 left-5' : 'top-3.5 left-3.5'} flex items-center gap-2 z-20`}>
        <span
          className="block w-1.5 h-1.5 rounded-full"
          style={{ background: style.accent, boxShadow: `0 0 8px ${style.glow}` }}
        />
        <span
          className="font-display text-[10px] font-black uppercase tracking-[0.3em]"
          style={{ color: style.accent, opacity: 0.92 }}
        >
          {category.label}
        </span>
      </div>

      {/* ── Wordmark SocialPro bottom-right — branding ────────────────── */}
      <div
        className={`absolute ${isFeatured || isHero ? 'bottom-5 right-5' : 'bottom-3.5 right-3.5'} z-20 flex items-center gap-1.5`}
      >
        {brand && (
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mr-1">
            {brand}
          </span>
        )}
        <span
          className="text-[9px] font-black uppercase tracking-[0.32em] text-white/30"
          style={{ letterSpacing: '0.32em' }}
        >
          SocialPro
        </span>
      </div>

      {/* ── Línea acento bottom — divisor editorial ──────────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${style.accent} 30%, ${style.accent} 70%, transparent)`,
          opacity: 0.4,
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Composición con logo de marca real — para casos de éxito Razer/1WIN... */

function BrandedComposition({
  brand,
  accent,
  accentSoft,
  variant,
}: {
  brand: { name: string; logoUrl: string };
  accent: string;
  accentSoft: string;
  variant: Variant;
}) {
  const logoSize =
    variant === 'hero' ? 'w-[55%] max-w-[460px]'
    : variant === 'featured' ? 'w-[60%] max-w-[300px]'
    : 'w-[58%] max-w-[200px]';

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Bloque luminoso detrás del logo */}
      <div
        className="absolute"
        style={{
          width: '70%',
          height: '70%',
          background: `radial-gradient(ellipse, ${accentSoft} 0%, transparent 60%)`,
          filter: 'blur(40px)',
        }}
      />

      {/* Logo de marca — centrado, con grain blend */}
      <div className={`relative ${logoSize} flex items-center justify-center`}>
        <Image
          src={brand.logoUrl}
          alt={brand.name}
          width={460}
          height={140}
          className="w-full h-auto object-contain drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
          style={{ maxHeight: '38%' }}
          priority={variant === 'hero' || variant === 'featured'}
        />
      </div>

      {/* Línea "× SocialPro" debajo del logo */}
      <div className="absolute bottom-[28%] left-1/2 -translate-x-1/2 flex items-center gap-2.5 opacity-60">
        <span className="block h-px w-8" style={{ background: accent }} />
        <span className="text-[10px] font-black uppercase tracking-[0.35em] text-white/55">
          × SocialPro
        </span>
        <span className="block h-px w-8" style={{ background: accent }} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Composición editorial sin marca — tipografía dominante                  */

function EditorialComposition({
  title,
  category,
  accent,
  variant,
}: {
  title: string;
  category: BlogCategory;
  accent: string;
  variant: Variant;
}) {
  // Iniciales del título — acento tipográfico fantasma
  const initials =
    title
      .split(' ')
      .filter((w) => w.length > 3)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || category.label.slice(0, 1).toUpperCase();

  const initialsSize =
    variant === 'hero' ? 'clamp(8rem, 28vw, 22rem)'
    : variant === 'featured' ? 'clamp(6rem, 22vw, 16rem)'
    : 'clamp(5rem, 20vw, 14rem)';

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <span
        className="absolute font-display font-black uppercase select-none pointer-events-none"
        style={{
          fontSize: initialsSize,
          lineHeight: 0.85,
          color: accent,
          opacity: 0.07,
          letterSpacing: '-0.06em',
          mixBlendMode: 'screen',
        }}
      >
        {initials}
      </span>

      {/* Línea acento horizontal */}
      <div
        className="absolute bottom-1/3 left-8 right-8 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          opacity: 0.35,
        }}
      />
    </div>
  );
}
