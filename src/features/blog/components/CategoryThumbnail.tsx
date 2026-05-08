/**
 * CategoryThumbnail — fallback editorial premium cuando un post no tiene coverUrl.
 *
 * Cada categoría tiene:
 *  - Paleta de gradientes multicapa (no flat)
 *  - Patrón geométrico distintivo en SVG
 *  - Glow radial específico
 *  - Iniciales fantasma como acento tipográfico
 *
 * Hook IA: cuando exista `cover_url` en la BD, BlogCover usa la imagen real.
 * Esta capa es el último recurso visual — debe parecer editorial, no placeholder.
 *
 * @kind server
 */

import type { BlogCategory } from '@/lib/utils/blog';

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
    bg: 'radial-gradient(ellipse 80% 60% at 30% 20%, #f5632a14 0%, transparent 55%), linear-gradient(135deg, #0c0303 0%, #2a0a02 35%, #4d1604 70%, #7c2209 100%)',
    accent: '#f5632a',
    accentSoft: 'rgba(245,99,42,0.16)',
    glow: 'rgba(245,99,42,0.30)',
    pattern: 'lines',
  },
  igaming: {
    bg: 'radial-gradient(ellipse 70% 60% at 70% 30%, #8b3aad22 0%, transparent 60%), linear-gradient(135deg, #07020e 0%, #14062b 40%, #2a0a52 75%, #4a0d8a 100%)',
    accent: '#a855f7',
    accentSoft: 'rgba(168,85,247,0.18)',
    glow: 'rgba(139,58,173,0.35)',
    pattern: 'hex',
  },
  guia: {
    bg: 'radial-gradient(ellipse 70% 70% at 20% 80%, #5b9bd514 0%, transparent 55%), linear-gradient(135deg, #020812 0%, #051a30 40%, #0a3461 75%, #155a8e 100%)',
    accent: '#60a5fa',
    accentSoft: 'rgba(96,165,250,0.16)',
    glow: 'rgba(91,155,213,0.30)',
    pattern: 'grid',
  },
  tendencias: {
    bg: 'radial-gradient(ellipse 80% 50% at 70% 70%, #10b98114 0%, transparent 55%), linear-gradient(135deg, #010906 0%, #032213 40%, #064e36 75%, #0a7252 100%)',
    accent: '#34d399',
    accentSoft: 'rgba(52,211,153,0.16)',
    glow: 'rgba(16,185,129,0.30)',
    pattern: 'wave',
  },
  youtube: {
    bg: 'radial-gradient(ellipse 75% 60% at 30% 30%, #ef444414 0%, transparent 55%), linear-gradient(135deg, #110203 0%, #2e0507 40%, #5e0c11 75%, #95141b 100%)',
    accent: '#f87171',
    accentSoft: 'rgba(239,68,68,0.16)',
    glow: 'rgba(239,68,68,0.30)',
    pattern: 'play',
  },
  esports: {
    bg: 'radial-gradient(ellipse 70% 60% at 50% 30%, #3b82f614 0%, transparent 55%), linear-gradient(135deg, #020610 0%, #08152e 40%, #122e5f 75%, #1d4a8b 100%)',
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
        <svg className="absolute inset-0 w-full h-full opacity-[0.09]" aria-hidden>
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
              <polygon
                points="24,2 44,14 44,30 24,42 4,30 4,14"
                fill="none"
                stroke={stroke}
                strokeWidth="0.7"
              />
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
        <svg className="absolute inset-0 w-full h-full opacity-[0.10]" aria-hidden viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice">
          <path d="M0,260 Q150,200 300,240 T600,220 V400 H0 Z" fill={stroke} opacity="0.20" />
          <path d="M0,300 Q150,260 300,290 T600,280 V400 H0 Z" fill={stroke} opacity="0.30" />
        </svg>
      );
    case 'play':
      return (
        <svg className="absolute inset-0 w-full h-full opacity-[0.06]" aria-hidden viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice">
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
  const style = CATEGORY_STYLES[category.slug] ?? FALLBACK_STYLES_DEFAULT();
  const patternId = `pat-${category.slug}-${variant}`;

  // Iniciales del título — acento tipográfico fantasma
  const initials = title
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
    <div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: style.bg }}
      aria-hidden
    >
      {/* Patrón geométrico de categoría */}
      <PatternSvg kind={style.pattern} accent={style.accent} id={patternId} />

      {/* Glow radial principal */}
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse 60% 55% at 50% 65%, ${style.glow}, transparent 70%)` }}
      />

      {/* Iniciales fantasma — protagonismo tipográfico */}
      <span
        className="absolute font-display font-black uppercase select-none pointer-events-none"
        style={{
          fontSize: initialsSize,
          lineHeight: 0.85,
          color: style.accent,
          opacity: 0.06,
          letterSpacing: '-0.06em',
          mixBlendMode: 'screen',
        }}
      >
        {initials}
      </span>

      {/* Línea acento horizontal — divisor editorial */}
      <div
        className="absolute bottom-1/3 left-8 right-8 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${style.accent}, transparent)`,
          opacity: 0.35,
        }}
      />

      {/* Esquina superior izquierda — etiqueta de categoría */}
      <div
        className="absolute top-4 left-4 flex items-center gap-2 z-10"
      >
        <span
          className="block w-1.5 h-1.5 rounded-full"
          style={{ background: style.accent, boxShadow: `0 0 8px ${style.glow}` }}
        />
        <span
          className="font-display text-[10px] font-black uppercase tracking-[0.3em]"
          style={{ color: style.accent, opacity: 0.85 }}
        >
          {category.label}
        </span>
      </div>

      {/* Brand opcional — esquina inferior derecha */}
      {brand && (
        <div className="absolute bottom-4 right-4 z-10">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
            {brand}
          </span>
        </div>
      )}

      {/* Punto acento esquina inferior derecha si no hay brand */}
      {!brand && (
        <div
          className="absolute bottom-4 right-4 w-1.5 h-1.5 rounded-full"
          style={{ background: style.accent, opacity: 0.55 }}
        />
      )}
    </div>
  );
}

function FALLBACK_STYLES_DEFAULT(): CategoryStyle {
  return FALLBACK_STYLE;
}
