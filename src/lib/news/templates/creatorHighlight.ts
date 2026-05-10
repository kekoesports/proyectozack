import type { BuiltPost, TemplateBaseInput } from './types';
import { assertSlug, clampExcerpt, mergeTags, renderEcosystemFooter, renderReviewBlock } from './helpers';

export type CreatorHighlightInput = TemplateBaseInput & {
  /** Slug del creator en /talentos/[slug] — debe existir en DB */
  readonly talentSlug: string;
  /** Nombre humano del creator (para titulares y body) */
  readonly creatorName: string;
  /** Plataforma principal — Twitch, YouTube, Kick, etc. */
  readonly platform: string;
  /** Lectura editorial corta sobre por qué destacarlo ahora */
  readonly hook: string;
  /** Highlights — momentos, métricas, contenido reciente */
  readonly highlights: readonly string[];
  /** Storyline — qué viene/qué seguir */
  readonly storyline: string;
};

export function buildCreatorHighlightPost(input: CreatorHighlightInput): BuiltPost {
  assertSlug(input.slug);
  assertSlug(input.talentSlug);

  if (input.highlights.length < 2 || input.highlights.length > 8) {
    throw new Error('CreatorHighlightInput.highlights must contain 2-8 entries');
  }

  const title = `Creator highlight: ${input.creatorName} (${input.platform})`;
  const excerpt = clampExcerpt(`${input.hook} Repaso editorial al creator dentro del ecosistema SocialPro.`);

  const intro = `${input.hook}

[${input.creatorName}](/talentos/${input.talentSlug}) entra en nuestro radar editorial — perfil del creator dentro del ecosistema SocialPro.`;

  const highlightsBlock = `## Highlights recientes

${input.highlights.map((h) => `- ${h}`).join('\n')}`;

  const storylineBlock = `## Qué seguir de aquí en adelante

${input.storyline}`;

  const closing = `## Sobre la cobertura

SocialPro News mantiene seguimiento editorial de los creators del roster. Si trabajas con marcas y quieres activar una campaña con ${input.creatorName} u otros creators del roster, [contacta con la agencia](/contacto).`;

  const bodyMd = [
    intro,
    highlightsBlock,
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
    tags: mergeTags(
      ['cs2', 'creators', 'socialpro', input.platform.toLowerCase()],
      input.extraTags,
    ),
  };
}
