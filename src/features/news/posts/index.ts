import type { PostBlocks } from '@/features/news/components/article-blocks/types';
import { blocks as gentleMatesAstana } from './gentle-mates-alex-astana';
import { blocks as gentleMatesCambioTonoAstana } from './gentle-mates-cambio-tono-astana';

/**
 * Registro slug → PostBlocks. Cada noticia editorial con bloques visuales
 * extra (match, roster, quote, embed) añade una entrada aquí. Si un slug
 * no está en el registro, el article page renderiza solo body + ecosystem
 * + related (comportamiento default sin regresión).
 */
export const POST_BLOCKS: Readonly<Record<string, PostBlocks>> = {
  'gentle-mates-alex-romper-barreras-mentales-astana': gentleMatesAstana,
  'gentle-mates-cambio-tono-astana-2026': gentleMatesCambioTonoAstana,
};

export function getPostBlocks(slug: string): PostBlocks | null {
  return POST_BLOCKS[slug] ?? null;
}
