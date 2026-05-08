/**
 * CategoryThumbnail — fallback editorial cuando un post no tiene coverUrl.
 *
 * Diseño por categoría con profundidad visual (gradientes multicapa,
 * textura de líneas, acento geométrico). Preparado para ser sustituido
 * por imágenes generadas con Higgsfield/DALL-E en el futuro.
 *
 * HOOK Higgsfield: cuando `generatedUrl` esté disponible en la tabla posts,
 * usar esa URL en lugar de este componente (misma interfaz, solo cambiar
 * la condición en BlogCard/FeaturedBlogCard).
 */

import type { BlogCategory } from '@/lib/utils/blog';

type Props = {
  readonly category: BlogCategory;
  readonly title: string;
  readonly brand?: string;
};

const CATEGORY_STYLES: Record<string, {
  bg: string;
  accentColor: string;
  lineColor: string;
  glowColor: string;
}> = {
  'caso-exito': {
    bg: 'linear-gradient(135deg, #1a0500 0%, #3d0f00 40%, #7c2209 70%, #f5632a22 100%)',
    accentColor: '#f5632a',
    lineColor: 'rgba(245,99,42,0.12)',
    glowColor: 'rgba(245,99,42,0.25)',
  },
  'igaming': {
    bg: 'linear-gradient(135deg, #0d0118 0%, #1e0440 45%, #4a0d8a 80%, #8b3aad22 100%)',
    accentColor: '#8b3aad',
    lineColor: 'rgba(139,58,173,0.15)',
    glowColor: 'rgba(139,58,173,0.3)',
  },
  'guia': {
    bg: 'linear-gradient(135deg, #020d1a 0%, #051f3d 45%, #0a3d78 80%, #5b9bd522 100%)',
    accentColor: '#5b9bd5',
    lineColor: 'rgba(91,155,213,0.12)',
    glowColor: 'rgba(91,155,213,0.25)',
  },
  'tendencias': {
    bg: 'linear-gradient(135deg, #010f08 0%, #052e16 45%, #065f46 80%, #10b98122 100%)',
    accentColor: '#10b981',
    lineColor: 'rgba(16,185,129,0.12)',
    glowColor: 'rgba(16,185,129,0.25)',
  },
  'youtube': {
    bg: 'linear-gradient(135deg, #1a0000 0%, #3d0505 45%, #7a1010 80%, #dc262622 100%)',
    accentColor: '#ef4444',
    lineColor: 'rgba(239,68,68,0.12)',
    glowColor: 'rgba(239,68,68,0.25)',
  },
  'esports': {
    bg: 'linear-gradient(135deg, #040c1a 0%, #0f1f3d 45%, #1e3a6b 80%, #3b82f622 100%)',
    accentColor: '#60a5fa',
    lineColor: 'rgba(96,165,250,0.12)',
    glowColor: 'rgba(96,165,250,0.25)',
  },
  'noticias': {
    bg: 'linear-gradient(135deg, #080808 0%, #1a1a1a 50%, #2d2d2d 100%)',
    accentColor: '#e03070',
    lineColor: 'rgba(224,48,112,0.12)',
    glowColor: 'rgba(224,48,112,0.2)',
  },
};

export function CategoryThumbnail({ category, title, brand }: Props) {
  const fallback = { bg: 'linear-gradient(135deg,#080808,#2d2d2d)', accentColor: '#e03070', lineColor: 'rgba(224,48,112,0.12)', glowColor: 'rgba(224,48,112,0.2)' };
  const style = CATEGORY_STYLES[category.slug] ?? CATEGORY_STYLES['noticias'] ?? fallback;

  // Iniciales del título para el acento tipográfico
  const initials = title
    .split(' ')
    .filter((w) => w.length > 3)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: style.bg }}
      aria-hidden
    >
      {/* Líneas de rejilla diagonal — textura editorial */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.07]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id={`grid-${category.slug}`} width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
            <line x1="0" y1="0" x2="0" y2="40" stroke={style.accentColor} strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#grid-${category.slug})`} />
      </svg>

      {/* Glow radial centrado */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 60%, ${style.glowColor}, transparent 70%)`,
        }}
      />

      {/* Iniciales tipográficas — elemento de fondo */}
      <span
        className="absolute font-display font-black uppercase select-none"
        style={{
          fontSize: 'clamp(5rem, 20vw, 14rem)',
          lineHeight: 1,
          color: style.accentColor,
          opacity: 0.07,
          letterSpacing: '-0.05em',
          userSelect: 'none',
        }}
      >
        {initials}
      </span>

      {/* Línea acento horizontal */}
      <div
        className="absolute bottom-1/3 left-8 right-8 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${style.accentColor}, transparent)`, opacity: 0.3 }}
      />

      {/* Categoría label centrada */}
      <div className="relative z-10 flex flex-col items-center gap-2 text-center px-4">
        <span
          className="font-display text-[10px] font-black uppercase tracking-[0.35em]"
          style={{ color: style.accentColor, opacity: 0.8 }}
        >
          {category.label}
        </span>
        {brand && (
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/30">
            {brand}
          </span>
        )}
      </div>

      {/* Punto acento esquina inferior derecha */}
      <div
        className="absolute bottom-4 right-4 w-1.5 h-1.5 rounded-full"
        style={{ background: style.accentColor, opacity: 0.5 }}
      />
    </div>
  );
}
