import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';
import Link from 'next/link';
import Image from 'next/image';

import { getTalents } from '@/lib/queries/talents';
import { absoluteUrl, SITE_URL } from '@/lib/site-url';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Gaming Talent Roster — Verified Streamers in Spain & LatAm',
  description:
    'Browse SocialPro’s gaming talent roster. CS2, Valorant, Twitch and YouTube creators with verified audiences across Spain and LatAm. 15M+ monthly views.',
  alternates: {
    canonical: '/talents',
    languages: {
      en: absoluteUrl('/talents'),
      es: absoluteUrl('/talentos'),
      'x-default': absoluteUrl('/talentos'),
    },
  },
  openGraph: {
    title: 'Gaming Talent Roster — Verified Streamers in Spain & LatAm | SocialPro',
    description: 'CS2, Valorant, Twitch and YouTube creators with verified audiences. 15M+ monthly views across Spain and LatAm.',
    url: absoluteUrl('/talents'),
    images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gaming Talent Roster | SocialPro',
    description: 'Verified gaming streamers in Spain and LatAm. 15M+ monthly views.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

const g = {
  background: 'linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%)',
  WebkitBackgroundClip: 'text' as const,
  WebkitTextFillColor: 'transparent' as const,
  backgroundClip: 'text' as const,
};

export default async function TalentsEnPage() {
  const talents = await getTalents();

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'SocialPro Gaming Talent Roster',
    description: 'Streamers and gaming content creators managed by SocialPro across Spain and LatAm.',
    url: absoluteUrl('/talents'),
    inLanguage: 'en',
    numberOfItems: talents.length,
    itemListElement: talents.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Person',
        name: t.name,
        jobTitle: t.role,
        url: absoluteUrl(`/talentos/${t.slug}`),
        ...(t.photoUrl ? { image: t.photoUrl } : {}),
        worksFor: { '@type': 'Organization', name: 'SocialPro', url: SITE_URL },
      },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListJsonLd) }} />

      {/* Hero */}
      <section className="bg-sp-black pt-32 pb-16 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-4">Our roster</p>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-tight mb-6">
            Verified gaming creators<br /><span style={g}>with proven track records</span>
          </h1>
          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto">
            Before any activation, we share audience verification data, past campaign performance
            and engagement authenticity reports. No assumptions — just evidence.
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {talents.map((t) => (
              <Link
                key={t.id}
                href={`/talentos/${t.slug}`}
                className="group block rounded-2xl bg-sp-off border border-sp-border overflow-hidden hover:border-sp-orange transition-colors"
              >
                <div className="relative aspect-[4/5] bg-sp-dark/5 overflow-hidden">
                  {t.photoUrl ? (
                    <Image src={t.photoUrl} alt={t.name} fill sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-display text-3xl font-black text-sp-muted">
                      {t.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-display text-base font-black uppercase text-sp-dark truncate">{t.name}</p>
                  <p className="text-xs text-sp-muted truncate">{t.role}</p>
                  {t.stats && t.stats.length > 0 && (
                    <p className="text-[11px] text-sp-orange font-semibold mt-2 truncate">
                      {t.stats[0]?.label}: {t.stats[0]?.value}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Internal links */}
      <nav aria-label="Niche campaigns" className="bg-sp-off border-t border-sp-border py-8">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-sp-muted mb-4">Niche campaigns</p>
          <div className="flex flex-wrap gap-2">
            {[
              { href: '/cs2-influencer-marketing', label: 'CS2 Influencer Marketing' },
              { href: '/valorant-influencers-agency', label: 'Valorant Influencers' },
              { href: '/betting-influencers', label: 'Betting Influencers' },
              { href: '/esports-marketing-agency', label: 'Esports Marketing' },
              { href: '/twitch-streamers-agency', label: 'Twitch Streamers' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="text-xs font-semibold text-sp-muted hover:text-sp-orange border border-sp-border hover:border-sp-orange rounded-full px-3 py-1.5 transition-colors">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* CTA */}
      <section className="bg-sp-black py-16 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-3xl md:text-4xl font-black uppercase text-white mb-4">
            Want to <span style={g}>work with these creators?</span>
          </h2>
          <p className="text-white/60 mb-8">Tell us your brand, target audience and KPIs. We deliver a custom proposal in 48 hours.</p>
          <Link href="/contact" className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity">
            Find creators that fit your campaign
          </Link>
        </div>
      </section>
    </>
  );
}
