import type { MetadataRoute } from 'next';

import { getCaseSlugs } from '@/lib/queries/cases';
import { getTalentSlugs } from '@/lib/queries/talents';
import { getPostSlugs, getNewsSlugs } from '@/lib/queries/posts';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';
import { getBrandSlugs } from '@/lib/brands';

// priority and changeFrequency omitted — Google ignores both fields (2023+).
const BUILD_DATE = new Date();

const D = {
  home:          BUILD_DATE,
  talentos:      BUILD_DATE,
  servicios:     BUILD_DATE,
  igaming:       BUILD_DATE,
  casos:         BUILD_DATE,
  nosotros:      new Date('2025-01-15'),
  contacto:      new Date('2025-01-15'),
  metodologia:   new Date('2025-01-15'),
  paraCreadores: BUILD_DATE,
  blog:          BUILD_DATE,
  giveaways:     BUILD_DATE,
  sorteos:       BUILD_DATE,
} as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cases, talentSlugs, postSlugs, newsSlugs] = await Promise.all([
    getCaseSlugs(),
    getTalentSlugs(),
    getPostSlugs(),
    getNewsSlugs(),
  ]);

  const caseEntries: MetadataRoute.Sitemap = cases.map((c) => ({
    url: absoluteUrl(`/casos/${c.slug}`),
    lastModified: c.updatedAt,
  }));

  const talentEntries: MetadataRoute.Sitemap = talentSlugs.map((t) => ({
    url: absoluteUrl(`/talentos/${t.slug}`),
    lastModified: t.updatedAt,
  }));

  // /c/[slug] y /creadores/[slug] son noindex — no incluir en sitemap

  const postEntries: MetadataRoute.Sitemap = postSlugs.map((p) => ({
    url: absoluteUrl(`/blog/${p.slug}`),
    lastModified: p.updatedAt,
  }));

  const newsEntries: MetadataRoute.Sitemap = newsSlugs.map((p) => ({
    url: absoluteUrl(`/news/${p.slug}`),
    lastModified: p.updatedAt,
  }));

  // ── Marketing core bilingual pairs ────────────────────────────────────────
  // ES = mercado principal → x-default apunta siempre a la versión española.
  const corePairs: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: D.home,
      alternates: { languages: { es: SITE_URL, en: absoluteUrl('/en'), 'x-default': SITE_URL } },
    },
    {
      url: absoluteUrl('/en'),
      lastModified: D.home,
      alternates: { languages: { en: absoluteUrl('/en'), es: SITE_URL, 'x-default': SITE_URL } },
    },
    {
      url: absoluteUrl('/talentos'),
      lastModified: D.talentos,
      alternates: { languages: { es: absoluteUrl('/talentos'), en: absoluteUrl('/talents'), 'x-default': absoluteUrl('/talentos') } },
    },
    {
      url: absoluteUrl('/talents'),
      lastModified: D.talentos,
      alternates: { languages: { en: absoluteUrl('/talents'), es: absoluteUrl('/talentos'), 'x-default': absoluteUrl('/talentos') } },
    },
    {
      url: absoluteUrl('/servicios'),
      lastModified: D.servicios,
      alternates: { languages: { es: absoluteUrl('/servicios'), en: absoluteUrl('/services'), 'x-default': absoluteUrl('/servicios') } },
    },
    {
      url: absoluteUrl('/services'),
      lastModified: D.servicios,
      alternates: { languages: { en: absoluteUrl('/services'), es: absoluteUrl('/servicios'), 'x-default': absoluteUrl('/servicios') } },
    },
    {
      url: absoluteUrl('/casos'),
      lastModified: D.casos,
      alternates: { languages: { es: absoluteUrl('/casos'), en: absoluteUrl('/cases'), 'x-default': absoluteUrl('/casos') } },
    },
    {
      url: absoluteUrl('/cases'),
      lastModified: D.casos,
      alternates: { languages: { en: absoluteUrl('/cases'), es: absoluteUrl('/casos'), 'x-default': absoluteUrl('/casos') } },
    },
    {
      url: absoluteUrl('/contacto'),
      lastModified: D.contacto,
      alternates: { languages: { es: absoluteUrl('/contacto'), en: absoluteUrl('/contact'), 'x-default': absoluteUrl('/contacto') } },
    },
    {
      url: absoluteUrl('/contact'),
      lastModified: D.contacto,
      alternates: { languages: { en: absoluteUrl('/contact'), es: absoluteUrl('/contacto'), 'x-default': absoluteUrl('/contacto') } },
    },
  ];

  // ── Multilingual landing pairs ────────────────────────────────────────────
  // x-default → versión española (mercado principal ES/LATAM).
  const bilingualLandings: MetadataRoute.Sitemap = [
    // CS2 — /influencers-cs2 es la canónica principal (tiene la keyword ES)
    {
      url: absoluteUrl('/influencers-cs2'),
      lastModified: BUILD_DATE,
      alternates: { languages: { es: absoluteUrl('/influencers-cs2'), en: absoluteUrl('/cs2-influencer-marketing'), 'x-default': absoluteUrl('/influencers-cs2') } },
    },
    {
      url: absoluteUrl('/cs2-influencer-marketing'),
      lastModified: BUILD_DATE,
      alternates: { languages: { en: absoluteUrl('/cs2-influencer-marketing'), es: absoluteUrl('/influencers-cs2'), 'x-default': absoluteUrl('/influencers-cs2') } },
    },
    // Valorant
    {
      url: absoluteUrl('/valorant-influencers-agency'),
      lastModified: BUILD_DATE,
      alternates: { languages: { en: absoluteUrl('/valorant-influencers-agency'), es: absoluteUrl('/agencia-influencers-valorant'), 'x-default': absoluteUrl('/agencia-influencers-valorant') } },
    },
    {
      url: absoluteUrl('/agencia-influencers-valorant'),
      lastModified: BUILD_DATE,
      alternates: { languages: { es: absoluteUrl('/agencia-influencers-valorant'), en: absoluteUrl('/valorant-influencers-agency'), 'x-default': absoluteUrl('/agencia-influencers-valorant') } },
    },
    // Betting — /betting-influencers es la canónica principal (tiene la keyword)
    {
      url: absoluteUrl('/betting-influencers'),
      lastModified: BUILD_DATE,
      alternates: { languages: { en: absoluteUrl('/betting-influencers'), es: absoluteUrl('/servicios/igaming'), 'x-default': absoluteUrl('/betting-influencers') } },
    },
    // Esports
    {
      url: absoluteUrl('/esports-marketing-agency'),
      lastModified: BUILD_DATE,
      alternates: { languages: { en: absoluteUrl('/esports-marketing-agency'), es: absoluteUrl('/agencia-marketing-esports'), 'x-default': absoluteUrl('/agencia-marketing-esports') } },
    },
    {
      url: absoluteUrl('/agencia-marketing-esports'),
      lastModified: BUILD_DATE,
      alternates: { languages: { es: absoluteUrl('/agencia-marketing-esports'), en: absoluteUrl('/esports-marketing-agency'), 'x-default': absoluteUrl('/agencia-marketing-esports') } },
    },
    // Twitch — solo EN, sin par ES todavía
    {
      url: absoluteUrl('/twitch-streamers-agency'),
      lastModified: BUILD_DATE,
      alternates: { languages: { en: absoluteUrl('/twitch-streamers-agency'), 'x-default': absoluteUrl('/twitch-streamers-agency') } },
    },
  ];

  return [
    ...corePairs,
    // ES-only core pages
    {
      url: absoluteUrl('/servicios/igaming'),
      lastModified: D.igaming,
      alternates: { languages: { es: absoluteUrl('/servicios/igaming'), en: absoluteUrl('/betting-influencers'), 'x-default': absoluteUrl('/betting-influencers') } },
    },
    { url: absoluteUrl('/ganadores'),        lastModified: BUILD_DATE             },
    ...getBrandSlugs().map((slug) => ({ url: absoluteUrl(`/marcas/${slug}`), lastModified: BUILD_DATE })),
    { url: absoluteUrl('/faq'),              lastModified: BUILD_DATE             },
    { url: absoluteUrl('/terminos-sorteos'), lastModified: BUILD_DATE             },
    { url: absoluteUrl('/nosotros'),         lastModified: D.nosotros      },
    { url: absoluteUrl('/metodologia'),      lastModified: D.metodologia   },
    { url: absoluteUrl('/para-creadores'),   lastModified: D.paraCreadores },
    { url: absoluteUrl('/agencia-gaming-latam'), lastModified: BUILD_DATE         },
    { url: absoluteUrl('/guia-dgoj-igaming-influencers'), lastModified: BUILD_DATE },
    { url: absoluteUrl('/apuesta-segura-cs2'), lastModified: BUILD_DATE           },
    { url: absoluteUrl('/blog'),             lastModified: D.blog          },
    { url: absoluteUrl('/news'),             lastModified: BUILD_DATE             },
    { url: absoluteUrl('/news/live'),        lastModified: BUILD_DATE             },
    {
      url: absoluteUrl('/codigos'),
      lastModified: D.giveaways,
      alternates: { languages: { en: absoluteUrl('/codigos'), es: absoluteUrl('/sorteos'), 'x-default': absoluteUrl('/sorteos') } },
    },
    {
      url: absoluteUrl('/sorteos'),
      lastModified: D.sorteos,
      alternates: { languages: { es: absoluteUrl('/sorteos'), en: absoluteUrl('/codigos'), 'x-default': absoluteUrl('/sorteos') } },
    },
    ...bilingualLandings,
    ...caseEntries,
    ...talentEntries,
    ...postEntries,
    ...newsEntries,
  ];
}
