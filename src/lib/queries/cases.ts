import { cache } from 'react';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { caseStudies, talents } from '@/db/schema';
import type { CaseStudyWithRelations } from '@/types';

/**
 * Devuelve los slugs de los case studies, usado para `generateStaticParams` en `/casos/[slug]`.
 *
 * @cache none
 * @visibility public
 * @returns array de `{ slug, updatedAt }` (puede ser vacío). Nunca null.
 */
export async function getCaseSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  return db
    .select({ slug: caseStudies.slug, updatedAt: caseStudies.updatedAt })
    .from(caseStudies)
    .where(eq(caseStudies.isPublished, true));
}

/**
 * Devuelve todos los case studies con body, tags y creators, ordenados por sortOrder ASC, para `/casos`.
 *
 * @cache none
 * @visibility public
 * @returns array de CaseStudyWithRelations (puede ser vacío). Nunca null.
 */
export async function getCaseStudies(): Promise<CaseStudyWithRelations[]> {
  const rows = await db.query.caseStudies.findMany({
    with: {
      body: { orderBy: (b, { asc }) => [asc(b.sortOrder)] },
      tags: true,
      creators: true,
    },
    orderBy: (c, { asc }) => [asc(c.sortOrder)],
  });
  return rows.map((row) => ({
    ...row,
    creators: row.creators.map((c) => ({ ...c, talentSlug: null })),
  }));
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
  if (!row) return undefined;

  // Enrich creators with talent slug for internal linking
  const talentIds = row.creators
    .map((c) => c.talentId)
    .filter((id): id is number => id !== null);

  const talentSlugs =
    talentIds.length > 0
      ? await db
          .select({ id: talents.id, slug: talents.slug })
          .from(talents)
          .where(inArray(talents.id, talentIds))
      : [];

  const slugMap = new Map(talentSlugs.map((t) => [t.id, t.slug]));

  return {
    ...row,
    creators: row.creators.map((c) => ({
      ...c,
      talentSlug: c.talentId !== null ? (slugMap.get(c.talentId) ?? null) : null,
    })),
  };
});
