import type { BuiltPost, TemplateBaseInput } from './types';
import { assertSlug, clampExcerpt, mergeTags, renderEcosystemFooter, renderReviewBlock } from './helpers';

export type WeeklyWatchMatch = {
  readonly when: string;
  readonly league: string;
  readonly teamA: string;
  readonly teamB: string;
  readonly hook: string;
};

export type WeeklyWatchInput = TemplateBaseInput & {
  /** Etiqueta de la semana — ej. "Semana 19 · 6-12 mayo" */
  readonly weekLabel: string;
  /** Qué hace especial la semana — gancho narrativo */
  readonly narrative: string;
  /** 3-5 partidos clave a destacar */
  readonly matches: readonly WeeklyWatchMatch[];
  /** Storyline secundaria (opcional) — tendencia de fondo o roster move */
  readonly storyline?: string;
};

function renderMatchesBlock(matches: readonly WeeklyWatchMatch[]): string {
  if (matches.length < 1 || matches.length > 6) {
    throw new Error('WeeklyWatchInput.matches must contain 1-6 entries');
  }
  return matches
    .map((m, i) => {
      return `### ${i + 1}. ${m.teamA} vs ${m.teamB}

**${m.league}** · ${m.when}

${m.hook}`;
    })
    .join('\n\n');
}

export function buildWeeklyWatchPost(input: WeeklyWatchInput): BuiltPost {
  assertSlug(input.slug);

  const title = `Qué ver esta semana en CS2: ${input.weekLabel}`;
  const excerpt = clampExcerpt(`${input.narrative} Selección editorial de los ${input.matches.length} partidos clave de la semana.`);

  const intro = `${input.narrative}

Esta es nuestra selección editorial — los ${input.matches.length} partidos que más vale la pena seguir en directo o en VOD durante la semana.`;

  const matchesBlock = `## Partidos clave de la semana

${renderMatchesBlock(input.matches)}`;

  const storylineBlock = input.storyline
    ? `## Storyline de fondo

${input.storyline}`
    : '';

  const closing = `## Cómo seguir la cobertura

Match previews previos al inicio de cada partido en SocialPro News. Análisis competitivo y picks editoriales en el canal de Telegram.`;

  const bodyMd = [
    intro,
    matchesBlock,
    storylineBlock,
    closing,
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
    tags: mergeTags(['cs2', 'esports', 'calendario', 'qué-ver-esta-semana'], input.extraTags),
  };
}
