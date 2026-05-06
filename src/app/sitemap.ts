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

  // /c/[slug] y /creadores/[slug] son noindex — no incluir en sitemap

  const postEntries: MetadataRoute.Sitemap = postSlugs.map((p) => ({
    url: absoluteUrl(`/blog/${p.slug}`),
    lastModified: p.updatedAt,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // ── Marketing core bilingual pairs ────────────────────────────────────────
  // ES = mercado principal → x-default apunta siempre a la versión española.
  const corePairs: MetadataRoute.Sitemap = [
    // Home
    {
      url: SITE_URL,
      lastModified: D.home, changeFrequency: 'weekly', priority: 1,
      alternates: { languages: { es: SITE_URL, en: absoluteUrl('/en'), 'x-default': SITE_URL } },
    },
    {
      url: absoluteUrl('/en'),
      lastModified: D.home, changeFrequency: 'weekly', priority: 0.95,
      alternates: { languages: { en: absoluteUrl('/en'), es: SITE_URL, 'x-default': SITE_URL } },
    },
    // Talents
    {
      url: absoluteUrl('/talentos'),
      lastModified: D.talentos, changeFrequency: 'weekly', priority: 0.9,
      alternates: { languages: { es: absoluteUrl('/talentos'), en: absoluteUrl('/talents'), 'x-default': absoluteUrl('/talentos') } },
    },
    {
      url: absoluteUrl('/talents'),
      lastModified: D.talentos, changeFrequency: 'weekly', priority: 0.85,
      alternates: { languages: { en: absoluteUrl('/talents'), es: absoluteUrl('/talentos'), 'x-default': absoluteUrl('/talentos') } },
    },
    // Services
    {
      url: absoluteUrl('/servicios'),
      lastModified: D.servicios, changeFrequency: 'monthly', priority: 0.8,
      alternates: { languages: { es: absoluteUrl('/servicios'), en: absoluteUrl('/services'), 'x-default': absoluteUrl('/servicios') } },
    },
    {
      url: absoluteUrl('/services'),
      lastModified: D.servicios, changeFrequency: 'monthly', priority: 0.85,
      alternates: { languages: { en: absoluteUrl('/services'), es: absoluteUrl('/servicios'), 'x-default': absoluteUrl('/servicios') } },
    },
    // Cases
    {
      url: absoluteUrl('/casos'),
      lastModified: D.casos, changeFrequency: 'weekly', priority: 0.8,
      alternates: { languages: { es: absoluteUrl('/casos'), en: absoluteUrl('/cases'), 'x-default': absoluteUrl('/casos') } },
    },
    {
      url: absoluteUrl('/cases'),
      lastModified: D.casos, changeFrequency: 'weekly', priority: 0.85,
      alternates: { languages: { en: absoluteUrl('/cases'), es: absoluteUrl('/casos'), 'x-default': absoluteUrl('/casos') } },
    },
    // Contact
    {
      url: absoluteUrl('/contacto'),
      lastModified: D.contacto, changeFrequency: 'monthly', priority: 0.8,
      alternates: { languages: { es: absoluteUrl('/contacto'), en: absoluteUrl('/contact'), 'x-default': absoluteUrl('/contacto') } },
    },
    {
      url: absoluteUrl('/contact'),
      lastModified: D.contacto, changeFrequency: 'monthly', priority: 0.85,
      alternates: { languages: { en: absoluteUrl('/contact'), es: absoluteUrl('/contacto'), 'x-default': absoluteUrl('/contacto') } },
    },
  ];

  // ── Multilingual landing pairs ────────────────────────────────────────────
  // x-default → versión española (mercado principal ES/LATAM).
  const bilingualLandings: MetadataRoute.Sitemap = [
    // CS2 — /influencers-cs2 es la canónica principal (tiene la keyword ES)
    {
      url: absoluteUrl('/influencers-cs2'),
      lastModified: NOW, changeFrequency: 'monthly', priority: 0.85,
      alternates: { languages: { es: absoluteUrl('/influencers-cs2'), en: absoluteUrl('/cs2-influencer-marketing'), 'x-default': absoluteUrl('/influencers-cs2') } },
    },
    {
      url: absoluteUrl('/cs2-influencer-marketing'),
      lastModified: NOW, changeFrequency: 'monthly', priority: 0.80,
      alternates: { languages: { en: absoluteUrl('/cs2-influencer-marketing'), es: absoluteUrl('/influencers-cs2'), 'x-default': absoluteUrl('/influencers-cs2') } },
    },
    // Valorant
    {
      url: absoluteUrl('/valorant-influencers-agency'),
      lastModified: NOW, changeFrequency: 'monthly', priority: 0.85,
      alternates: { languages: { en: absoluteUrl('/valorant-influencers-agency'), es: absoluteUrl('/agencia-influencers-valorant'), 'x-default': absoluteUrl('/agencia-influencers-valorant') } },
    },
    {
      url: absoluteUrl('/agencia-influencers-valorant'),
      lastModified: NOW, changeFrequency: 'monthly', priority: 0.80,
      alternates: { languages: { es: absoluteUrl('/agencia-influencers-valorant'), en: absoluteUrl('/valorant-influencers-agency'), 'x-default': absoluteUrl('/agencia-influencers-valorant') } },
    },
    // Betting — /betting-influencers es la canónica principal (tiene la keyword)
    // /servicios/igaming es el par ES; hreflang recíproco en ambas entradas
    {
      url: absoluteUrl('/betting-influencers'),
      lastModified: NOW, changeFrequency: 'monthly', priority: 0.85,
      alternates: { languages: { en: absoluteUrl('/betting-influencers'), es: absoluteUrl('/servicios/igaming'), 'x-default': absoluteUrl('/betting-influencers') } },
    },
    // Esports
    {
      url: absoluteUrl('/esports-marketing-agency'),
      lastModified: NOW, changeFrequency: 'monthly', priority: 0.85,
      alternates: { languages: { en: absoluteUrl('/esports-marketing-agency'), es: absoluteUrl('/agencia-marketing-esports'), 'x-default': absoluteUrl('/agencia-marketing-esports') } },
    },
    {
      url: absoluteUrl('/agencia-marketing-esports'),
      lastModified: NOW, changeFrequency: 'monthly', priority: 0.80,
      alternates: { languages: { es: absoluteUrl('/agencia-marketing-esports'), en: absoluteUrl('/esports-marketing-agency'), 'x-default': absoluteUrl('/agencia-marketing-esports') } },
    },
    // Twitch — solo EN, sin par ES todavía
    {
      url: absoluteUrl('/twitch-streamers-agency'),
      lastModified: NOW, changeFrequency: 'monthly', priority: 0.80,
      alternates: { languages: { en: absoluteUrl('/twitch-streamers-agency'), 'x-default': absoluteUrl('/twitch-streamers-agency') } },
    },
  ];

  return [
    // ── Marketing core (bilingual pairs: home, talents, services, cases, contact) ──
    ...corePairs,
    // ── Other ES-only core pages ──────────────────────────────────────────
    { url: absoluteUrl('/servicios/igaming'), lastModified: D.igaming, changeFrequency: 'monthly', priority: 0.85,
      alternates: { languages: { es: absoluteUrl('/servicios/igaming'), en: absoluteUrl('/betting-influencers'), 'x-default': absoluteUrl('/betting-influencers') } } },
    { url: absoluteUrl('/nosotros'),          lastModified: D.nosotros,      changeFrequency: 'monthly', priority: 0.7  },
    { url: absoluteUrl('/metodologia'),       lastModified: D.metodologia,   changeFrequency: 'monthly', priority: 0.7  },
    { url: absoluteUrl('/para-creadores'),    lastModified: D.paraCreadores, changeFrequency: 'monthly', priority: 0.8  },
    { url: absoluteUrl('/agencia-gaming-latam'), lastModified: NOW, changeFrequency: 'monthly', priority: 0.85 },
    { url: absoluteUrl('/blog'),              lastModified: D.blog,          changeFrequency: 'weekly',  priority: 0.7  },
    { url: absoluteUrl('/giveaways'), lastModified: D.giveaways, changeFrequency: 'daily', priority: 0.8,
      alternates: { languages: { en: absoluteUrl('/giveaways'), es: absoluteUrl('/sorteos'), 'x-default': absoluteUrl('/sorteos') } } },
    { url: absoluteUrl('/sorteos'), lastModified: D.sorteos, changeFrequency: 'daily', priority: 0.75,
      alternates: { languages: { es: absoluteUrl('/sorteos'), en: absoluteUrl('/giveaways'), 'x-default': absoluteUrl('/sorteos') } } },
    // ── Multilingual SEO landings ─────────────────────────────────────────
    ...bilingualLandings,
    // ── Dynamic entries ───────────────────────────────────────────────────
    ...caseEntries,
    ...talentEntries,
    ...postEntries,
  ];
}
