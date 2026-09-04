import { buildTalentSearchTitle } from '@/lib/talentSeo';
import { buildBreadcrumbJsonLd } from '@/lib/utils/breadcrumbs';
import { absoluteUrl, schemaImageUrl } from '@/lib/site-url';
import type { Talent, TalentWithRelations } from '@/types';
import { generateTalentFaqs } from './components/TalentSeoSection';

export function toTalentBase(talent: TalentWithRelations): Talent {
  return {
    id: talent.id, slug: talent.slug, name: talent.name, role: talent.role, role2: talent.role2,
    game: talent.game, platform: talent.platform, status: talent.status, bio: talent.bio,
    gradientC1: talent.gradientC1, gradientC2: talent.gradientC2, initials: talent.initials,
    photoUrl: talent.photoUrl, sortOrder: talent.sortOrder, visibility: talent.visibility,
    topGeos: talent.topGeos, audienceLanguage: talent.audienceLanguage,
    creatorCountry: talent.creatorCountry, audienceStatus: talent.audienceStatus,
    lastStatsUpdateAt: talent.lastStatsUpdateAt, updatedAt: talent.updatedAt,
    cnmcStatus: talent.cnmcStatus, cnmcRegisteredAt: talent.cnmcRegisteredAt,
    cnmcNotes: talent.cnmcNotes, hasRcInsurance: talent.hasRcInsurance,
    taxType: talent.taxType, nif: talent.nif, fiscalName: talent.fiscalName,
    fiscalAddress: talent.fiscalAddress, iaeEpigrafe: talent.iaeEpigrafe,
    iaeActividad: talent.iaeActividad, featuredLive: talent.featuredLive,
    excludeFromLive: talent.excludeFromLive, featuredFallback: talent.featuredFallback,
    bioLong: talent.bioLong, highlights: talent.highlights,
    seoBioGenerated: talent.seoBioGenerated, seoBioManual: talent.seoBioManual,
    seoBioStatus: talent.seoBioStatus, seoTitle: talent.seoTitle,
    seoDescription: talent.seoDescription, seoKeywords: talent.seoKeywords,
    isPublished: talent.isPublished, showInRoster: talent.showInRoster,
    archivedAt: talent.archivedAt, archivedBy: talent.archivedBy,
  };
}

export function buildTalentStructuredData(talent: TalentWithRelations) {
  const followerStatistics = buildFollowerStatistics(talent);
  const personSchema = {
    '@type': 'Person',
    '@id': absoluteUrl(`/talentos/${talent.slug}`),
    name: talent.name,
    jobTitle: talent.role,
    url: absoluteUrl(`/talentos/${talent.slug}`),
    ...(talent.bio || talent.bioLong ? { description: (talent.bio ?? talent.bioLong ?? '').trim().slice(0, 500) } : {}),
    ...(schemaImageUrl(talent.photoUrl) ? { image: schemaImageUrl(talent.photoUrl) } : {}),
    ...(talent.tags.length > 0 ? { knowsAbout: talent.tags.map((tag) => tag.tag) } : {}),
    ...(followerStatistics.length > 0 ? { interactionStatistic: followerStatistics } : {}),
    worksFor: { '@type': 'Organization', '@id': absoluteUrl('/#organization') },
    sameAs: talent.socials.flatMap((social) => social.profileUrl ? [social.profileUrl] : []),
  };

  const faqs = generateTalentFaqs({
    name: talent.name, role: talent.role, game: talent.game, platform: talent.platform,
    bioLong: talent.bioLong, tags: talent.tags, socials: talent.socials,
    topGeos: talent.topGeos, audienceLanguage: talent.audienceLanguage,
    creatorCountry: talent.creatorCountry,
  });

  return {
    faqPageJsonLd: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question', name: faq.q,
        acceptedAnswer: { '@type': 'Answer', text: faq.a },
      })),
    },
    profilePageJsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      '@id': absoluteUrl(`/talentos/${talent.slug}#profilepage`),
      url: absoluteUrl(`/talentos/${talent.slug}`),
      name: `${buildTalentSearchTitle(talent)} | SocialPro`,
      inLanguage: 'es',
      dateModified: talent.updatedAt.toISOString(),
      isPartOf: { '@type': 'WebSite', '@id': absoluteUrl('/#website') },
      mainEntity: personSchema,
    },
    breadcrumbJsonLd: buildBreadcrumbJsonLd([
      { name: 'Talentos', url: absoluteUrl('/talentos') },
      { name: talent.name, url: absoluteUrl(`/talentos/${talent.slug}`) },
    ]),
  };
}

function buildFollowerStatistics(talent: TalentWithRelations) {
  return talent.socials
    .filter((social) => social.followersDisplay && social.followersDisplay !== '-')
    .map((social) => ({
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/FollowAction',
      userInteractionCount: parseFollowers(social.followersDisplay),
      name: social.platform,
    }));
}

function parseFollowers(display: string): number {
  const compact = display.trim();
  if (/[Mm]$/i.test(compact)) return Math.round(Number.parseFloat(compact) * 1_000_000);
  if (/[Kk]$/i.test(compact)) return Math.round(Number.parseFloat(compact) * 1_000);
  return Number.parseInt(compact.replace(/[.,\s]/g, ''), 10) || 0;
}
