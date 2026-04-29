import type { MetadataRoute } from 'next';

import { getCaseSlugs } from '@/lib/queries/cases';
import { getTalentSlugs } from '@/lib/queries/talents';
import { getPostSlugs } from '@/lib/queries/posts';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';

// ── Static page last-modified dates ──────────────────────────────────────────
// Update these manually when you make significant content changes to each page.
const STATIC_DATES = {
  home:          new Date('2025-04-27'),
  talentos:      new Date('2025-04-27'),
  servicios:     new Date('2025-01-15'),
  igaming:       new Date('2025-01-15'),
  casos:         new Date('2025-04-27'),
  nosotros:      new Date('2025-01-15'),
  contacto:      new Date('2025-01-15'),
  metodologia:   new Date('2025-01-15'),
  paraCreadores: new Date('2025-04-27'),
  blog:          new Date('2025-04-27'),
  giveaways:     new Date('2025-04-27'),
  sorteos:       new Date('2025-04-27'),
} as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cases, talentSlugs, postSlugs] = await Promise.all([
    getCaseSlugs(),
    getTalentSlugs(),
    getPostSlugs(),
  ]);

  const caseEntries: MetadataRoute.Sitemap = cases.map((c) => ({
    url: absoluteUrl(`/casos/${c.slug}`),
    lastModified: c.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const talentEntries: MetadataRoute.Sitemap = talentSlugs.map((t) => ({
    url: absoluteUrl(`/talentos/${t.slug}`),
    lastModified: t.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const creatorHubEntries: MetadataRoute.Sitemap = talentSlugs.map((t) => ({
    url: absoluteUrl(`/c/${t.slug}`),
    lastModified: t.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const creadorEntries: MetadataRoute.Sitemap = talentSlugs.map((t) => ({
    url: absoluteUrl(`/creadores/${t.slug}`),
    lastModified: t.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const postEntries: MetadataRoute.Sitemap = postSlugs.map((p) => ({
    url: absoluteUrl(`/blog/${p.slug}`),
    lastModified: p.updatedAt,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: STATIC_DATES.home,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: absoluteUrl('/talentos'),
      lastModified: STATIC_DATES.talentos,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: absoluteUrl('/servicios'),
      lastModified: STATIC_DATES.servicios,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/servicios/igaming'),
      lastModified: STATIC_DATES.igaming,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/casos'),
      lastModified: STATIC_DATES.casos,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/nosotros'),
      lastModified: STATIC_DATES.nosotros,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: absoluteUrl('/contacto'),
      lastModified: STATIC_DATES.contacto,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/metodologia'),
      lastModified: STATIC_DATES.metodologia,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: absoluteUrl('/para-creadores'),
      lastModified: STATIC_DATES.paraCreadores,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/blog'),
      lastModified: STATIC_DATES.blog,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: absoluteUrl('/giveaways'),
      lastModified: STATIC_DATES.giveaways,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: absoluteUrl('/sorteos'),
      lastModified: STATIC_DATES.sorteos,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    ...caseEntries,
    ...talentEntries,
    ...creatorHubEntries,
    ...creadorEntries,
    ...postEntries,
  ];
}
