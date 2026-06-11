import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

import { getTalents } from '@/lib/queries/talents';
import { getCaseStudies } from '@/lib/queries/cases';
import { absoluteUrl, SITE_URL } from '@/lib/site-url';
import { safeJsonLd } from '@/lib/safeJsonLd';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Gaming & Esports Influencer Marketing Agency — Spain & LatAm',
  description:
    'SocialPro connects creators with brands. 13+ years in gaming, esports and iGaming influencer marketing. Verified streamers in Spain and LatAm. Performance-tracked campaigns.',
  alternates: {
    canonical: '/en',
    languages: {
      en: absoluteUrl('/en'),
      es: SITE_URL,
      'x-default': SITE_URL,
    },
  },
  openGraph: {
    title: 'Gaming & Esports Influencer Marketing Agency | SocialPro',
    description:
      'Verified gaming creators in Spain and LatAm. Performance-tracked campaigns for iGaming, esports and consumer brands.',
    url: absoluteUrl('/en'),
    type: 'website',
    images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630, alt: 'Gaming & Esports Influencer Marketing Agency — SocialPro' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gaming & Esports Influencer Marketing Agency | SocialPro',
    description: 'Verified gaming creators in Spain and LatAm. Performance-tracked influencer campaigns.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

const g = {
  background: 'linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%)',
  WebkitBackgroundClip: 'text' as const,
  WebkitTextFillColor: 'transparent' as const,
  backgroundClip: 'text' as const,
};

const STATS = [
  { stat: '13+',  label: 'Years in gaming marketing' },
  { stat: '15M+', label: 'Monthly views across roster' },
  { stat: '+340', label: 'FTDs in a single activation' },
  { stat: '8M+',  label: 'Reach on flagship CS2 campaign' },
];

const SERVICES = [
  { title: 'Influencer campaigns', desc: 'Streamer activations for awareness, product launches and conversion-focused campaigns. Every creator verified, every metric tracked.' },
  { title: 'iGaming campaigns', desc: 'Specialised campaigns for betting, casino and skins operators. DGOJ compliance built in. FTD tracking from day one.' },
  { title: 'Talent management', desc: 'Full representation for gaming creators: deal negotiation, content strategy, sponsorship management and channel growth.' },
  { title: 'Esports activations', desc: 'Brand integrations in tournaments, custom overlays, in-stream mentions and live audience activations.' },
];

const FAQ = [
  { q: 'What does SocialPro do?', a: 'SocialPro is a gaming and esports influencer marketing agency. We connect brands with verified streamers and creators in Spain and LatAm, and we manage end-to-end campaigns with performance tracking and compliance built in.' },
  { q: 'Which markets do you cover?', a: 'Spain, Mexico, Argentina, Colombia and Chile — the largest Spanish-speaking gaming markets. Our roster reaches over 15 million monthly viewers across Twitch and YouTube.' },
  { q: 'How fast can a campaign launch?', a: 'From brief to live in under 72 hours for our verified roster. This includes creator selection, contract signing, compliance briefing and publishing coordination.' },
  { q: 'How do you measure results?', a: 'Every streamer gets a unique tracking code. We monitor clicks, registrations and FTDs (First Time Deposits) attributed per creator. Reports use raw data, not estimates.' },
  { q: 'What makes SocialPro different?', a: 'We have been exclusively in gaming, esports and iGaming since 2012. We are not a generic agency that added "gaming" to its portfolio — we know the culture, platforms, audiences and compliance.' },
];


const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': absoluteUrl('/en#faq'),
  inLanguage: 'en',
  mainEntity: FAQ.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
};

export default async function HomeEnPage() {
  const [talents, cases] = await Promise.all([getTalents(), getCaseStudies()]);
  const topTalents = talents.slice(0, 8);
  const topCases   = cases.slice(0, 3);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />

      {/* Hero */}
      <section className="relative bg-sp-black text-white pt-32 pb-24 overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-sp-muted2 mb-6">
            Gaming &amp; Esports · Spain · Europe · LatAm
          </p>
          <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight leading-[0.9] mb-8">
            The gaming & iGaming<br /><span style={g}>influencer agency</span><br />where operators verify every FTD
          </h1>
          <p className="text-base sm:text-lg text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            Every FTD attributed. Every streamer verified. Every campaign compliance-ready.
            13 years exclusively in gaming — no generalist detours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/cases" className="px-10 py-4 rounded-full font-bold text-white text-sm tracking-widest uppercase bg-sp-grad hover:opacity-90 transition-opacity">
              See what we&apos;ve delivered
            </Link>
            <Link href="/contact?type=brand" className="px-10 py-4 rounded-full font-bold text-white text-sm tracking-widest uppercase border border-white/15 hover:bg-white/5 transition-colors">
              Start a proposal
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {STATS.map(({ stat, label }) => (
              <div key={label} className="text-center">
                <div className="font-display text-3xl font-black" style={g}>{stat}</div>
                <div className="text-[11px] text-white/40 mt-1 uppercase tracking-wide">{label}</div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.25em] text-sp-muted2/80">
            Reply within 24h · No commitment
          </p>
        </div>
      </section>

      {/* Talent preview */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Our roster</p>
            <h2 className="font-display text-3xl md:text-4xl font-black uppercase text-sp-dark mb-4">
              <span style={g}>Streamers and creators</span> with verified audiences
            </h2>
            <p className="text-sp-muted max-w-xl mx-auto text-sm leading-relaxed">
              Verified audiences, real engagement. Browse creators by game or platform.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
            {topTalents.map((t) => (
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
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center">
            <Link href="/talents" className="inline-block text-sm font-semibold text-sp-orange hover:underline">
              View full roster →
            </Link>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="bg-sp-off py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">What we do</p>
          <h2 className="font-display text-3xl md:text-4xl font-black uppercase text-sp-dark mb-10">
            Performance-driven gaming marketing
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {SERVICES.map((s) => (
              <div key={s.title} className="rounded-2xl border border-sp-border bg-white p-6">
                <h3 className="font-display text-base font-black uppercase text-sp-dark mb-3">{s.title}</h3>
                <p className="text-sm text-sp-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/services" className="inline-block text-sm font-semibold text-sp-orange hover:underline">
              All services →
            </Link>
          </div>
        </div>
      </section>

      {/* Case studies */}
      {topCases.length > 0 && (
        <section className="bg-white py-16 md:py-20">
          <div className="max-w-5xl mx-auto px-6">
            <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Recent campaigns</p>
            <h2 className="font-display text-3xl md:text-4xl font-black uppercase text-sp-dark mb-10">
              Verified results, not estimates
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {topCases.map((c) => (
                <Link
                  key={c.id}
                  href={`/casos/${c.slug}`}
                  className="group block rounded-2xl border border-sp-border bg-sp-off p-6 hover:border-sp-orange transition-colors"
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider text-sp-orange mb-2">{c.brandName}</p>
                  <h3 className="font-display text-lg font-black uppercase text-sp-dark mb-2 group-hover:text-sp-orange transition-colors">{c.title}</h3>
                  {c.reach && <p className="font-display text-3xl font-black mb-2" style={g}>{c.reach}</p>}
                  {c.excerpt && <p className="text-sm text-sp-muted leading-relaxed">{c.excerpt}</p>}
                </Link>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href="/cases" className="inline-block text-sm font-semibold text-sp-orange hover:underline">
                View all cases →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="bg-sp-off py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">FAQ</p>
          <h2 className="font-display text-3xl md:text-4xl font-black uppercase text-sp-dark mb-10">
            Common questions
          </h2>
          <div className="space-y-4">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group rounded-2xl border border-sp-border bg-white p-5">
                <summary className="cursor-pointer font-display font-black uppercase text-sm text-sp-dark list-none flex justify-between items-center">
                  {q}
                  <span className="text-sp-orange ml-4 transition-transform group-open:rotate-180">▾</span>
                </summary>
                <p className="mt-3 text-sm text-sp-muted leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-sp-black py-20 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-3xl md:text-5xl font-black uppercase text-white mb-4">
            Let’s build your <span style={g}>next campaign</span>
          </h2>
          <p className="text-white/60 mb-8 leading-relaxed">
            +340 FTDs in one activation · 15M views/month · 13 years exclusively in gaming.
          </p>
          <Link href="/contact?type=brand" className="inline-block px-10 py-4 rounded-full font-bold text-white text-sm tracking-widest uppercase bg-sp-grad hover:opacity-90 transition-opacity">
            Start a proposal →
          </Link>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40">
            Reply within 24h · No commitment
          </p>
        </div>
      </section>
    </>
  );
}
