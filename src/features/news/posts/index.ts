import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { posts } from '@/db/schema';
import type { PostBlocks } from '@/features/news/components/article-blocks/types';
import { blocks as gentleMatesAstana } from './gentle-mates-alex-astana';
import { blocks as gentleMatesCambioTonoAstana } from './gentle-mates-cambio-tono-astana';
import { blocks as nineZPlayoffsAstana } from './9z-playoffs-astana-mouz';

/**
 * Registro slug → PostBlocks hardcodeado. Sirve como fallback mientras los
 * posts históricos no tengan blocksJson en DB. Cuando un post se edite desde
 * el admin, la versión DB tiene prioridad y este registro queda inactivo para
 * ese slug.
 */
const POST_BLOCKS_REGISTRY: Readonly<Record<string, PostBlocks>> = {
  'gentle-mates-alex-romper-barreras-mentales-astana': gentleMatesAstana,
  'gentle-mates-cambio-tono-astana-2026': gentleMatesCambioTonoAstana,
  '9z-playoffs-astana-mouz': nineZPlayoffsAstana,
};

/**
 * Lee los bloques visuales de un artículo.
 * Prioridad: DB (blocksJson) → registro hardcodeado → null.
 */
export async function getPostBlocks(slug: string): Promise<PostBlocks | null> {
  const row = await db
    .select({ blocksJson: posts.blocksJson })
    .from(posts)
    .where(eq(posts.slug, slug))
    .limit(1);

  const dbBlocks = row[0]?.blocksJson;
  if (dbBlocks && typeof dbBlocks === 'object' && Object.keys(dbBlocks).length > 0) {
    return dbBlocks as PostBlocks;
  }

  return POST_BLOCKS_REGISTRY[slug] ?? null;
}
