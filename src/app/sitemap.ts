import type { MetadataRoute } from 'next';

import { getCaseSlugs } from '@/lib/queries/cases';
import { getTalentSlugs } from '@/lib/queries/talents';
import { getPostSlugs } from '@/lib/queries/posts';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';

// Update lastModified manually when making significant content changes.
const NOW = new Date('2026-05-03');

const D = {
  home:          NOW,
  talentos:      NOW,
  servicios:     NOW,
  igaming:       NOW,
  casos:         NOW,
  nosotros:      new Date('2025-01-15'),
  contacto:      new Date('2025-01-15'),
  metodologia:   new Date('2025-01-15'),
  paraCreadores: NOW,
  blog:          NOW,
  giveaways:     NOW,
  sorteos:       NOW,
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

  // ── Multilingual landing pairs ────────────────────────────────────────────
  // EN (primary, priority 0.85) + ES (support, priority 0.80).
  // alternates.languages → Google outputs hreflang in sitemap.xml.
  // x-default always points to the EN version (international fallback).
  const bilingualLandings: MetadataRoute.Sitemap = [
    // CS2
    {
      url: absoluteUrl('/cs2-influencer-marketing'),
      lastModified: NOW, changeFrequency: 'monthly', priority: 0.85,
      alternates: { languages: { en: absoluteUrl('/cs2-influencer-marketing'), es: absoluteUrl('/influencers-cs2'), 'x-default': absoluteUrl('/cs2-influencer-marketing') } },
    },
    {
      url: absoluteUrl('/influencers-cs2'),
      lastModified: NOW, changeFrequency: 'monthly', priority: 0.80,
      alternates: { languages: { es: absoluteUrl('/influencers-cs2'), en: absoluteUrl('/cs2-influencer-marketing'), 'x-default': absoluteUrl('/cs2-influencer-marketing') } },
    },
    // Valorant
    {
      url: absoluteUrl('/valorant-influencers-agency'),
      lastModified: NOW, changeFrequency: 'monthly', priority: 0.85,
      alternates: { languages: { en: absoluteUrl('/valorant-influencers-agency'), es: absoluteUrl('/agencia-influencers-valorant'), 'x-default': absoluteUrl('/valorant-influencers-agency') } },
    },
    {
      url: absoluteUrl('/agencia-influencers-valorant'),
      lastModified: NOW, changeFrequency: 'monthly', priority: 0.80,
      alternates: { languages: { es: absoluteUrl('/agencia-influencers-valorant'), en: absoluteUrl('/valorant-influencers-agency'), 'x-default': absoluteUrl('/valorant-influencers-agency') } },
    },
    // Betting
    {
      url: absoluteUrl('/betting-influencers'),
      lastModified: NOW, changeFrequency: 'monthly', priority: 0.85,
      alternates: { languages: { en: absoluteUrl('/betting-influencers'), es: absoluteUrl('/influencers-betting'), 'x-default': absoluteUrl('/betting-influencers') } },
    },
    {
      url: absoluteUrl('/influencers-betting'),
      lastModified: NOW, changeFrequency: 'monthly', priority: 0.80,
      alternates: { languages: { es: absoluteUrl('/influencers-betting'), en: absoluteUrl('/betting-influencers'), 'x-default': absoluteUrl('/betting-influencers') } },
    },
    // Esports
    {
      url: absoluteUrl('/esports-marketing-agency'),
      lastModified: NOW, changeFrequency: 'monthly', priority: 0.85,
      alternates: { languages: { en: absoluteUrl('/esports-marketing-agency'), es: absoluteUrl('/agencia-marketing-esports'), 'x-default': absoluteUrl('/esports-marketing-agency') } },
    },
    {
      url: absoluteUrl('/agencia-marketing-esports'),
      lastModified: NOW, changeFrequency: 'monthly', priority: 0.80,
      alternates: { languages: { es: absoluteUrl('/agencia-marketing-esports'), en: absoluteUrl('/esports-marketing-agency'), 'x-default': absoluteUrl('/esports-marketing-agency') } },
    },
    // Twitch — EN only, no ES pair yet; x-default = itself
    {
      url: absoluteUrl('/twitch-streamers-agency'),
      lastModified: NOW, changeFrequency: 'monthly', priority: 0.80,
      alternates: { languages: { en: absoluteUrl('/twitch-streamers-agency'), 'x-default': absoluteUrl('/twitch-streamers-agency') } },
    },
    // /gaming/* redirect to ES landings — omitted from sitemap to avoid
    // signalling duplicate URLs. Vercel will serve 301s from next.config.ts.
  ];

  return [
    // ── Core pages ────────────────────────────────────────────────────────
    { url: SITE_URL,                         lastModified: D.home,          changeFrequency: 'weekly',  priority: 1    },
    { url: absoluteUrl('/talentos'),          lastModified: D.talentos,      changeFrequency: 'weekly',  priority: 0.9  },
    { url: absoluteUrl('/servicios'),         lastModified: D.servicios,     changeFrequency: 'monthly', priority: 0.8  },
    { url: absoluteUrl('/servicios/igaming'), lastModified: D.igaming,       changeFrequency: 'monthly', priority: 0.85 },
    { url: absoluteUrl('/casos'),             lastModified: D.casos,         changeFrequency: 'weekly',  priority: 0.8  },
    { url: absoluteUrl('/nosotros'),          lastModified: D.nosotros,      changeFrequency: 'monthly', priority: 0.7  },
    { url: absoluteUrl('/contacto'),          lastModified: D.contacto,      changeFrequency: 'monthly', priority: 0.8  },
    { url: absoluteUrl('/metodologia'),       lastModified: D.metodologia,   changeFrequency: 'monthly', priority: 0.7  },
    { url: absoluteUrl('/para-creadores'),    lastModified: D.paraCreadores, changeFrequency: 'monthly', priority: 0.8  },
    { url: absoluteUrl('/blog'),              lastModified: D.blog,          changeFrequency: 'weekly',  priority: 0.7  },
    { url: absoluteUrl('/giveaways'),         lastModified: D.giveaways,     changeFrequency: 'daily',   priority: 0.8  },
    { url: absoluteUrl('/sorteos'),           lastModified: D.sorteos,       changeFrequency: 'daily',   priority: 0.75 },
    // ── Multilingual SEO landings ─────────────────────────────────────────
    ...bilingualLandings,
    // ── Dynamic entries ───────────────────────────────────────────────────
    ...caseEntries,
    ...talentEntries,
    ...creatorHubEntries,
    ...creadorEntries,
    ...postEntries,
  ];
}
