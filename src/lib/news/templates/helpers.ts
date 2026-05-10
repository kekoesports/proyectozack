import { normalizeTags } from '../tags';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function assertSlug(slug: string): void {
  if (!SLUG_RE.test(slug) || slug.length === 0 || slug.length > 200) {
    throw new Error(`Invalid slug: "${slug}". Use kebab-case [a-z0-9-], 1-200 chars.`);
  }
}

/**
 * Combina tags base del template con extraTags del editor, normaliza y
 * deduplica. Garantiza que todos los tags resultantes son slugs válidos.
 */
export function mergeTags(
  base: readonly string[],
  extra: readonly string[] | undefined,
): string[] {
  return normalizeTags([...base, ...(extra ?? [])]);
}

/**
 * Renderiza el bloque de notas de revisión al final del body. Sólo
 * aparece si hay notas. Editor-facing — visible en preview para
 * recordar qué datos confirmar antes de publicar.
 */
export function renderReviewBlock(notes: readonly string[] | undefined): string {
  if (!notes || notes.length === 0) return '';
  const items = notes.map((n) => `- [REVISAR] ${n}`).join('\n');
  return `

## Notas de revisión

${items}`;
}

/**
 * Footer editorial estándar — link al canal Apuesta Segura CS2 cuando
 * el contenido encaja temáticamente con el ecosistema. Los templates
 * deciden si incluirlo según el formato.
 */
export function renderEcosystemFooter(): string {
  return `

> Cobertura editorial completa en [SocialPro News](/news). Análisis previos partido a partido en el canal de [Apuesta Segura CS2](/apuesta-segura-cs2).`;
}

export function clampExcerpt(text: string, max = 240): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  return t.slice(0, max - 1).replace(/\s\S*$/, '') + '…';
}
