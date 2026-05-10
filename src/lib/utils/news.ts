export type NewsCategorySlug =
  | 'actualidad'
  | 'analisis'
  | 'creators'
  | 'comunidad'
  | 'competitivo';

export type NewsCategory = {
  readonly slug: NewsCategorySlug;
  readonly label: string;
  readonly bg: string;
  readonly text: string;
  readonly border: string;
  readonly accent: string;
};

const CATEGORIES: Record<NewsCategorySlug, Omit<NewsCategory, 'slug'>> = {
  actualidad: {
    label: 'Actualidad',
    bg: 'bg-sp-pink/15',
    text: 'text-sp-pink',
    border: 'border-sp-pink/30',
    accent: 'bg-sp-pink',
  },
  analisis: {
    label: 'Análisis',
    bg: 'bg-sp-blue/15',
    text: 'text-sp-blue',
    border: 'border-sp-blue/30',
    accent: 'bg-sp-blue',
  },
  creators: {
    label: 'Creators',
    bg: 'bg-sp-orange/15',
    text: 'text-sp-orange',
    border: 'border-sp-orange/30',
    accent: 'bg-sp-orange',
  },
  comunidad: {
    label: 'Comunidad',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    accent: 'bg-emerald-400',
  },
  competitivo: {
    label: 'Competitivo',
    bg: 'bg-sp-purple/15',
    text: 'text-sp-purple',
    border: 'border-sp-purple/30',
    accent: 'bg-sp-purple',
  },
};

export const NEWS_CATEGORY_SLUGS: readonly NewsCategorySlug[] = [
  'actualidad',
  'analisis',
  'creators',
  'comunidad',
  'competitivo',
];

export function getNewsCategory(slug: NewsCategorySlug): NewsCategory {
  return { slug, ...CATEGORIES[slug] };
}

/**
 * Deriva la categoría editorial de un post /news a partir de slug + título.
 * Heurística por palabras clave; si nada matchea, cae en 'actualidad'.
 *
 * Orden de evaluación importa — términos más específicos se evalúan antes
 * que más genéricos para evitar falsos positivos. Ej.: "apuesta-segura"
 * y "blogabet" (Comunidad) deben ganar a "análisis competitivo" (Análisis).
 */
export function deriveNewsCategory(slug: string, title: string): NewsCategory {
  const haystack = `${slug} ${title}`.toLowerCase();

  // 1. Comunidad — términos más específicos del producto Apuesta Segura
  if (
    /apuesta[- ]?segura|blogabet|tipster|telegram|canal[- ]?oficial|comunidad/.test(haystack)
  ) {
    return getNewsCategory('comunidad');
  }
  // 2. Creators — perfiles editoriales y roster spotlights
  if (
    /\bcreator|streamer|talento|entrevista|spotlight|perfil|roster[- ]?socialpro\b/.test(haystack)
  ) {
    return getNewsCategory('creators');
  }
  // 3. Análisis — formatos editoriales (preview, breakdown, análisis explícito)
  if (
    /\banalisis|análisis|preview|breakdown|deep[- ]?dive|review\b/.test(haystack)
  ) {
    return getNewsCategory('analisis');
  }
  // 4. Competitivo — escena tier europeo, ligas y mapas
  if (
    /\bcompetitivo|esea|tier[- ]?[23]|esl|blast[- ]?premier|cct|iem|liga|torneo|roster[- ]?move|map[- ]?veto\b/.test(haystack)
  ) {
    return getNewsCategory('competitivo');
  }
  // 5. Default — actualidad genérica (majors, clasificaciones, etc.)
  return getNewsCategory('actualidad');
}

export function isNewsCategorySlug(value: string): value is NewsCategorySlug {
  return (NEWS_CATEGORY_SLUGS as readonly string[]).includes(value);
}

export function formatNewsDate(date: Date | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function readingMinutes(bodyMd: string): number {
  const words = bodyMd.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
