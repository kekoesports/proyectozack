import type { BuiltPost, TemplateBaseInput } from './types';
import { assertSlug, clampExcerpt, mergeTags, renderEcosystemFooter, renderReviewBlock } from './helpers';

export type PatchAnalysisInput = TemplateBaseInput & {
  /** Versión del patch — ej. "Spring Update 2026" */
  readonly version: string;
  /** Una frase con la lectura editorial — gancho del post */
  readonly hook: string;
  /** Cambios agrupados por categoría — al menos uno requerido */
  readonly changes: {
    readonly maps?: readonly string[];
    readonly weapons?: readonly string[];
    readonly utility?: readonly string[];
    readonly economy?: readonly string[];
    readonly other?: readonly string[];
  };
  /** Lectura del impacto competitivo */
  readonly impact: {
    readonly affectedMaps?: readonly string[];
    readonly metaShift: string;
    readonly winnersLosers?: string;
  };
};

function renderChangesBlock(changes: PatchAnalysisInput['changes']): string {
  const sections: string[] = [];
  const labels: Record<string, string> = {
    maps: 'Mapas',
    weapons: 'Armas',
    utility: 'Utility',
    economy: 'Economía',
    other: 'Otros',
  };
  for (const key of ['maps', 'weapons', 'utility', 'economy', 'other'] as const) {
    const items = changes[key];
    if (!items || items.length === 0) continue;
    const list = items.map((i) => `- ${i}`).join('\n');
    sections.push(`### ${labels[key]}\n\n${list}`);
  }
  if (sections.length === 0) {
    throw new Error('PatchAnalysisInput.changes must include at least one non-empty category');
  }
  return sections.join('\n\n');
}

export function buildPatchAnalysisPost(input: PatchAnalysisInput): BuiltPost {
  assertSlug(input.slug);

  const title = `${input.version}: análisis editorial del patch`;
  const excerpt = clampExcerpt(input.hook);

  const intro = `Valve publicó **${input.version}**. ${input.hook}

Este es nuestro análisis editorial — qué ha cambiado, qué impacto competitivo tiene y qué deberían vigilar los equipos en los próximos splits.`;

  const changesBlock = `## Qué ha cambiado

${renderChangesBlock(input.changes)}`;

  const impactLines: string[] = [];
  if (input.impact.affectedMaps && input.impact.affectedMaps.length > 0) {
    impactLines.push(`**Mapas afectados directamente:** ${input.impact.affectedMaps.join(', ')}.`);
  }
  impactLines.push(input.impact.metaShift);
  if (input.impact.winnersLosers) {
    impactLines.push(input.impact.winnersLosers);
  }
  const impactBlock = `## Impacto competitivo

${impactLines.join('\n\n')}`;

  const closing = `## Lectura final

${input.version} entra en circulación competitiva en cuanto los torneos profesionales actualizan su versión obligatoria. La adaptación de los rosters top a estos cambios marca la diferencia en los primeros splits posteriores.

Cobertura partido a partido en SocialPro News a medida que se vea cómo afectan estos cambios al juego competitivo.`;

  const bodyMd = [
    intro,
    changesBlock,
    impactBlock,
    closing,
    renderEcosystemFooter(),
    renderReviewBlock(input.reviewNotes),
  ]
    .filter(Boolean)
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
    tags: mergeTags(['cs2', 'esports', 'analisis', 'meta', 'patch-notes'], input.extraTags),
  };
}
