export function readTime(bodyMd: string): number {
  const words = bodyMd.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export type BlogCategory = {
  slug: string;
  label: string;
  // Tailwind classes — safe to use in server components
  bg: string;
  text: string;
  border: string;
};

const CATEGORIES: Record<string, Omit<BlogCategory, 'slug'>> = {
  'caso-exito': { label: 'Caso de éxito', bg: 'bg-sp-orange/15',      text: 'text-sp-orange',  border: 'border-sp-orange/30' },
  'igaming':    { label: 'iGaming',       bg: 'bg-purple-500/15',      text: 'text-purple-400', border: 'border-purple-500/30' },
  'guia':       { label: 'Guía',          bg: 'bg-blue-500/15',        text: 'text-blue-400',   border: 'border-blue-500/30' },
  'tendencias': { label: 'Tendencias',    bg: 'bg-emerald-500/15',     text: 'text-emerald-400',border: 'border-emerald-500/30' },
  'youtube':    { label: 'YouTube',       bg: 'bg-red-500/15',         text: 'text-red-400',    border: 'border-red-500/30' },
  'esports':    { label: 'Esports',       bg: 'bg-sp-blue/15',         text: 'text-sp-blue',    border: 'border-sp-blue/30' },
  'noticias':   { label: 'Noticias',      bg: 'bg-white/[0.08]',       text: 'text-white/60',   border: 'border-white/20' },
};

const DEFAULT_CAT: Omit<BlogCategory, 'slug'> = CATEGORIES['noticias'] ?? { label: 'Insights', bg: 'bg-white/[0.08]', text: 'text-white/60', border: 'border-white/20' };

function cat(key: keyof typeof CATEGORIES): BlogCategory {
  return { slug: key, ...(CATEGORIES[key] ?? DEFAULT_CAT) };
}

export function deriveCategory(slug: string, title: string): BlogCategory {
  const s = slug.toLowerCase();
  const t = title.toLowerCase();

  if (s.includes('activacion') || s.includes('anatomia') || t.includes('×') ||
      (s.includes('socialpro') && (s.includes('razer') || s.includes('1win') || s.includes('skinsmonkey') || s.includes('keydrop')))) {
    return cat('caso-exito');
  }
  if (s.includes('igaming') || s.includes('casino') || s.includes('dgoj') || s.includes('apuestas')) {
    return cat('igaming');
  }
  if (s.includes('guia') || s.includes('como-') || s.includes('conseguir') || s.includes('monetizar') || s.includes('elegir')) {
    return cat('guia');
  }
  // Esports antes de youtube/tendencias: CS2 posts con año o 'streamer' en slug no deben caer
  // en youtube (por 'streamer') ni en tendencias (por '-2026'). Palabras clave de esports son
  // más específicas que las de fecha o plataforma.
  if (s.includes('esports') || s.includes('cs2') || s.includes('gaming-hardware')) {
    return cat('esports');
  }
  if (s.includes('youtube') || s.includes('streamer') || s.includes('twitch') || s.includes('streaming')) {
    return cat('youtube');
  }
  if (s.includes('tendencia') || s.includes('latam') || s.includes('-2025') || s.includes('-2026')) {
    return cat('tendencias');
  }

  return cat('noticias');
}

/**
 * Detecta la marca asociada a un post desde el slug — para covers fallback con logo.
 * Devuelve un objeto con ruta del logo y nombre, o null si no se reconoce.
 */
export type DetectedBrand = {
  readonly slug:    string;
  readonly name:    string;
  readonly logoUrl: string;
};

const BRAND_REGISTRY: readonly DetectedBrand[] = [
  { slug: 'razer',       name: 'RAZER',       logoUrl: '/images/brands/razer.png' },
  { slug: '1win',        name: '1WIN',        logoUrl: '/images/brands/1win.png' },
  { slug: 'skinsmonkey', name: 'SKINSMONKEY', logoUrl: '/images/brands/skinsmonkey.png' },
  { slug: 'keydrop',     name: 'KEYDROP',     logoUrl: '/images/brands/keydrop.png' },
  { slug: 'hellcase',    name: 'HELLCASE',    logoUrl: '/images/brands/hellcase.png' },
  { slug: 'skinplace',   name: 'SKINPLACE',   logoUrl: '/images/brands/skinplace.png' },
];

export function detectBrand(slug: string, title: string): DetectedBrand | null {
  const haystack = `${slug.toLowerCase()} ${title.toLowerCase()}`;
  return BRAND_REGISTRY.find((b) => haystack.includes(b.slug)) ?? null;
}

export function formatBlogDate(date: Date | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}
