import type { Metadata } from 'next';

import { absoluteUrl, SITE_URL } from '@/lib/site-url';
import { safeJsonLd } from '@/lib/safeJsonLd';
import { ContactFormEn } from '@/features/contact/components/ContactFormEn';
import type { ContactForm } from '@/features/contact/components/ContactSection.parts';

export const metadata: Metadata = {
  title: 'Contact Our Gaming Marketing Agency',
  description:
    'Looking for streamers for your gaming or iGaming campaign? Tell us about your project. We reply within 24 hours. No commitment.',
  alternates: {
    canonical: '/contact',
    languages: {
      en: absoluteUrl('/contact'),
      es: absoluteUrl('/contacto'),
      'x-default': absoluteUrl('/contacto'),
    },
  },
  openGraph: {
    title: 'Contact Our Gaming Marketing Agency | SocialPro',
    description: 'Looking for streamers for your gaming or iGaming campaign? We reply within 24 hours.',
    url: absoluteUrl('/contact'),
    images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630, alt: 'Contact Our Gaming Marketing Agency — SocialPro' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Our Gaming Marketing Agency | SocialPro',
    description: 'Looking for streamers for your gaming or iGaming campaign? Reply within 24h.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  '@id': absoluteUrl('/contact'),
  url: absoluteUrl('/contact'),
  name: 'Contact SocialPro — Gaming & iGaming Influencer Agency',
  inLanguage: 'en',
  mainEntity: { '@type': 'Organization', '@id': absoluteUrl('/#organization') },
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'SocialPro', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Contact', item: absoluteUrl('/contact') },
    ],
  },
};

const g = {
  background: 'linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%)',
  WebkitBackgroundClip: 'text' as const,
  WebkitTextFillColor: 'transparent' as const,
  backgroundClip: 'text' as const,
};

export default async function ContactEnPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const typeParam = params.type;

  const resolvedType: 'brand' | 'talent' | null =
    typeParam === 'brand' ? 'brand' : typeParam === 'talent' ? 'talent' : null;
  const defaultValues: Partial<ContactForm> | undefined = resolvedType ? { type: resolvedType } : undefined;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      {/* Hero */}
      <section className="bg-sp-black pt-32 pb-12 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-4">Contact</p>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-tight mb-6">
            Let&apos;s talk <span style={g}>today</span>
          </h1>
          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto">
            Tell us about your campaign. We reply within 24 hours with a tailored proposal.
            No commitment &mdash; just a clear conversation.
          </p>
        </div>
      </section>

      {defaultValues ? <ContactFormEn defaultValues={defaultValues} /> : <ContactFormEn />}
    </>
  );
}
