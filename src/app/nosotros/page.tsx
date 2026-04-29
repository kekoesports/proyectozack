import type { Metadata } from 'next';
import { getTeam } from '@/lib/queries/content';
import { AboutSection } from '@/features/marketing-site/components/AboutSection';
import { TeamGrid } from '@/features/marketing-site/components/TeamGrid';
import { absoluteUrl, SITE_URL } from '@/lib/site-url';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Agencia Gaming España desde 2012',
  description:
    'SocialPro — agencia gaming fundada en Madrid en 2012 por ex-profesionales de esports. Especialistas en iGaming, CS2 y el ecosistema hispano.',
  alternates: {
    canonical: '/nosotros',
  },
  openGraph: {
    title: 'Agencia Gaming España desde 2012 | SocialPro',
    description:
      'SocialPro — agencia gaming fundada en Madrid en 2012 por ex-profesionales de esports. Especialistas en iGaming, CS2 y el ecosistema hispano.',
    url: absoluteUrl('/nosotros'),
    images: [{ url: absoluteUrl('/og-default.jpg'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agencia Gaming España desde 2012 | SocialPro',
    description:
      'Agencia gaming fundada en Madrid en 2012. Especialistas en iGaming, CS2 y el ecosistema hispano.',
    images: [absoluteUrl('/og-default.jpg')],
  },
};

export default async function NosotrosPage() {
  const team = await getTeam();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    '@id': absoluteUrl('/nosotros'),
    url: absoluteUrl('/nosotros'),
    name: 'Sobre SocialPro — Agencia Gaming España desde 2012',
    description:
      'SocialPro es una agencia de talentos gaming y esports fundada en Madrid en 2012. Especialistas en iGaming, CS2 y el ecosistema hispano de creadores.',
    inLanguage: 'es',
    about: {
      '@type': 'Organization',
      '@id': absoluteUrl('/#organization'),
      name: 'SocialPro',
      url: SITE_URL,
      foundingDate: '2012',
      foundingLocation: { '@type': 'Place', name: 'Madrid, España' },
      employee: team.map((m) => ({
        '@type': 'Person',
        name: m.name,
        jobTitle: m.role,
        description: m.bio,
        ...(m.photoUrl ? { image: m.photoUrl } : {}),
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div>
        <h1 className="sr-only">Agencia Gaming España desde 2012</h1>
        <AboutSection />
        <TeamGrid team={team} />
      </div>
    </>
  );
}
