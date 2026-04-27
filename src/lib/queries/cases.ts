import { cache } from 'react';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { caseStudies } from '@/db/schema';
import type { CaseStudyWithRelations } from '@/types';

/**
 * Devuelve los slugs de los case studies, usado para `generateStaticParams` en `/casos/[slug]`.
 *
 * @cache none
 * @visibility public
 * @returns array de `{ slug }` (puede ser vacío). Nunca null.
 */
export async function getCaseSlugs(): Promise<{ slug: string }[]> {
  return db.select({ slug: caseStudies.slug }).from(caseStudies);
}

/**
 * Devuelve todos los case studies con body, tags y creators, ordenados por sortOrder ASC, para `/casos`.
 *
 * @cache none
 * @visibility public
 * @returns array de CaseStudyWithRelations (puede ser vacío). Nunca null.
 */
export async function getCaseStudies(): Promise<CaseStudyWithRelations[]> {
  return db.query.caseStudies.findMany({
    with: {
      body: { orderBy: (b, { asc }) => [asc(b.sortOrder)] },
      tags: true,
      creators: true,
    },
    orderBy: (c, { asc }) => [asc(c.sortOrder)],
  });
}

/**
 * Devuelve un case study por slug con body, tags y creators, para la ficha `/casos/[slug]`.
 *
 * @cache wrapped in React cache() for request dedupe
 * @visibility public
 * @returns CaseStudyWithRelations | undefined (nunca null) si no existe el slug.
 */
export const getCaseBySlug = cache(async (slug: string): Promise<CaseStudyWithRelations | undefined> => {
  const row = await db.query.caseStudies.findFirst({
    where: eq(caseStudies.slug, slug),
    with: {
      body: { orderBy: (b, { asc }) => [asc(b.sortOrder)] },
      tags: true,
      creators: true,
    },
  });
  return row ?? undefined;
});
