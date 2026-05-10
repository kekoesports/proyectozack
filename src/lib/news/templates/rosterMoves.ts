import type { BuiltPost, TemplateBaseInput } from './types';
import { assertSlug, clampExcerpt, mergeTags, renderEcosystemFooter, renderReviewBlock } from './helpers';

export type RosterMoveItem = {
  readonly team: string;
  /** Tipo de movimiento — fichaje, salida, banco, IGL change, etc. */
  readonly type: 'in' | 'out' | 'bench' | 'role-change';
  readonly player: string;
  /** Lectura editorial corta del impacto del movimiento */
  readonly note: string;
};

export type RosterMovesInput = TemplateBaseInput & {
  /** Periodo cubierto — ej. "Octubre 2026" o "Pre-major Spring" */
  readonly period: string;
  /** Lectura general del periodo — gancho narrativo */
  readonly summary: string;
  /** Movimientos individuales — al menos 1, máx. 12 */
  readonly moves: readonly RosterMoveItem[];
  /** Lectura competitiva final — qué cambia en el ranking */
  readonly competitiveImpact: string;
};

const TYPE_LABELS: Record<RosterMoveItem['type'], string> = {
  in: 'Fichaje',
  out: 'Salida',
  bench: 'Banco',
  'role-change': 'Cambio de rol',
};

function renderMovesBlock(moves: readonly RosterMoveItem[]): string {
  if (moves.length < 1 || moves.length > 12) {
    throw new Error('RosterMovesInput.moves must contain 1-12 entries');
  }
  return moves
    .map((m) => {
      return `### ${m.team} · ${TYPE_LABELS[m.type]} — ${m.player}

${m.note}`;
    })
    .join('\n\n');
}

export function buildRosterMovesPost(input: RosterMovesInput): BuiltPost {
  assertSlug(input.slug);

  const title = `Roster moves CS2 · ${input.period}: lo importante`;
  const excerpt = clampExcerpt(`${input.summary} Repaso editorial a los movimientos del periodo y su lectura competitiva.`);

  const intro = `${input.summary}

Estos son los movimientos relevantes y la lectura editorial de cada uno — qué cambia en el roster, qué señal manda al mercado y cómo afecta al competitivo.`;

  const movesBlock = `## Movimientos relevantes

${renderMovesBlock(input.moves)}`;

  const impactBlock = `## Lectura competitiva

${input.competitiveImpact}`;

  const closing = `## Próximos eventos donde lo veremos

La forma reciente de un roster nuevo se confirma en los primeros 8-12 partidos competitivos. Cobertura partido a partido en SocialPro News para ver cómo afectan estos cambios.`;

  const bodyMd = [
    intro,
    movesBlock,
    impactBlock,
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
    tags: mergeTags(['cs2', 'esports', 'roster-moves', 'analisis'], input.extraTags),
  };
}
