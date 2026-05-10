/**
 * Catálogo de tags canónicos para SocialPro News. No es exhaustivo —
 * los posts pueden usar tags fuera de este registry — pero los conocidos
 * obtienen un label legible en lugar de la versión kebab.
 *
 * Ampliar este mapa cuando aparezca un tag recurrente.
 */
const KNOWN_TAGS: Record<string, string> = {
  // Genéricos
  cs2: 'CS2',
  esports: 'Esports',
  socialpro: 'SocialPro',
  // Torneos / ligas
  'blast-premier': 'BLAST Premier',
  'esea-advanced': 'ESEA Advanced',
  'esea-main': 'ESEA Main',
  'cct-europe': 'CCT Europe',
  iem: 'IEM',
  esl: 'ESL',
  'major-spring-2026': 'Major Spring 2026',
  // Verticales temáticas
  meta: 'Meta',
  mapas: 'Mapas',
  armas: 'Armas',
  utility: 'Utility',
  'roster-moves': 'Roster moves',
  picks: 'Picks',
  analisis: 'Análisis',
  'tier-2-eu': 'Tier 2 EU',
  'tier-3-eu': 'Tier 3 EU',
  spain: 'España',
  latam: 'LATAM',
  twitch: 'Twitch',
  youtube: 'YouTube',
  calendario: 'Calendario',
  // Producto SocialPro
  'apuesta-segura-cs2': 'Apuesta Segura CS2',
  blogabet: 'Blogabet',
  telegram: 'Telegram',
  arkeroz: 'ArkeroZ',
};

export function tagLabel(slug: string): string {
  return KNOWN_TAGS[slug] ?? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const TAG_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidTagSlug(value: string): boolean {
  return value.length > 0 && value.length <= 64 && TAG_SLUG_RE.test(value);
}

export function normalizeTags(input: readonly string[] | null | undefined): string[] {
  if (!input) return [];
  const seen = new Set<string>();
  for (const t of input) {
    const slug = String(t).toLowerCase().trim();
    if (!isValidTagSlug(slug)) continue;
    seen.add(slug);
  }
  return [...seen];
}
