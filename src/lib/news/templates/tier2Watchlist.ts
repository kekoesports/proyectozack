import type { BuiltPost, TemplateBaseInput } from './types';
import { assertSlug, clampExcerpt, mergeTags, renderEcosystemFooter, renderReviewBlock } from './helpers';

export type Tier2Pick = {
  readonly team: string;
  /** Categoría editorial — define qué se destaca del equipo */
  readonly category:
    | 'fichando-arriba'
    | 'academia-consolidada'
    | 'proyecto-joven'
    | 'reconstruccion'
    | 'outsider';
  /** Lectura editorial — por qué seguirlo */
  readonly why: string;
  /** Mapa(s) o estilo donde más destacan */
  readonly strength: string;
};

export type Tier2WatchlistInput = TemplateBaseInput & {
  /** Etiqueta del split o ventana cubierta */
  readonly periodLabel: string;
  /** Resumen narrativo del estado del tier 2 */
  readonly summary: string;
  /** 3-7 equipos seleccionados */
  readonly picks: readonly Tier2Pick[];
};

const CATEGORY_LABELS: Record<Tier2Pick['category'], string> = {
  'fichando-arriba': 'Fichando arriba',
  'academia-consolidada': 'Academia consolidada',
  'proyecto-joven': 'Proyecto joven',
  reconstruccion: 'Reconstrucción',
  outsider: 'Outsider',
};

function renderPicksBlock(picks: readonly Tier2Pick[]): string {
  if (picks.length < 3 || picks.length > 7) {
    throw new Error('Tier2WatchlistInput.picks must contain 3-7 entries');
  }
  return picks
    .map((p) => {
      return `### ${p.team}

**${CATEGORY_LABELS[p.category]}** · Fuerte en: ${p.strength}.

${p.why}`;
    })
    .join('\n\n');
}

export function buildTier2WatchlistPost(input: Tier2WatchlistInput): BuiltPost {
  assertSlug(input.slug);

  const title = `Tier 2 watchlist · ${input.periodLabel}: equipos a seguir`;
  const excerpt = clampExcerpt(`${input.summary} Selección editorial de ${input.picks.length} equipos del tier 2 europeo de CS2 que merecen seguimiento.`);

  const intro = `${input.summary}

El tier 2 europeo es donde se construyen los rosters tier 1 del año siguiente. Esta es nuestra selección editorial — equipos con narrativa propia que vale la pena seguir durante el split.`;

  const picksBlock = `## Watchlist editorial

${renderPicksBlock(input.picks)}`;

  const howToBlock = `## Cómo leer la watchlist

Estos equipos no son recomendaciones de apuesta — son perfiles editoriales. La forma de un tier 2 se confirma con consistencia durante varios meses, no con un buen partido aislado.

Para apuestas con análisis previo, las picks editoriales se publican en el canal de Telegram con stake calibrado.`;

  const bodyMd = [
    intro,
    picksBlock,
    howToBlock,
    renderEcosystemFooter(),
    renderReviewBlock(input.reviewNotes),
  ]
    .filter((s) => s.length > 0)
    .join('\n\n');

  return {
    slug: input.slug,
    title,
    excerpt,
    bodyMd,
    coverUrl: input.coverUrl,
    author: input.author,
    publishedAt: input.publishedAt,
    sortOrder: input.sortOrder,
    tags: mergeTags(['cs2', 'esports', 'tier-2-eu', 'competitivo', 'analisis'], input.extraTags),
  };
}
