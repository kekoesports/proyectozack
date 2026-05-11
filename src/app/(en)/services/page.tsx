import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';
import Link from 'next/link';

import { absoluteUrl, SITE_URL } from '@/lib/site-url';

export const metadata: Metadata = {
  title: 'Gaming, Esports & iGaming Marketing Services',
  description:
    'Influencer campaigns, iGaming activations, talent management and esports sponsorships. Performance-tracked services for brands targeting gaming audiences in Spain and LatAm.',
  alternates: {
    canonical: '/services',
    languages: {
      en: absoluteUrl('/services'),
      es: absoluteUrl('/servicios'),
      'x-default': absoluteUrl('/services'),
    },
  },
  openGraph: {
    title: 'Gaming, Esports & iGaming Marketing Services | SocialPro',
    description: 'Hire CS2, Valorant and iGaming streamers in Spain and LatAm. 15+ verified creators, <72h activation, FTD tracking included.',
    url: absoluteUrl('/services'),
    images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gaming, Esports & iGaming Services | SocialPro',
    description: 'CS2, Valorant and iGaming streamers in Spain and LatAm. <72h activation, FTD tracking included.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

const g = {
  background: 'linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%)',
  WebkitBackgroundClip: 'text' as const,
  WebkitTextFillColor: 'transparent' as const,
  backgroundClip: 'text' as const,
};

const SERVICES = [
  {
    title: 'Influencer campaigns',
    desc: 'Streamer activations on Twitch and YouTube for awareness, product launches and conversion-focused campaigns. Each creator vetted for audience authenticity. Every metric tracked end-to-end.',
    bullets: ['Audience verification', 'Creator briefing & content review', 'Live tracking & FTD attribution'],
  },
  {
    title: 'iGaming campaigns',
    desc: 'Specialised campaigns for betting, casino and skins operators. DGOJ compliance built into every step. FTD tracking and attribution per creator.',
    bullets: ['DGOJ compliance (Spain\'s gambling regulator) — built in, not optional', 'Age-gating & responsible-gambling disclaimers', 'Verified FTD reporting'],
  },
  {
    title: 'Talent management',
    desc: 'Full representation for gaming creators: deal negotiation, content strategy, sponsorship management and channel growth. We manage the relationship so brands and creators focus on results.',
    bullets: ['Deal negotiation', 'Content & growth strategy', 'Sponsorship & schedule management'],
  },
  {
    title: 'Esports activations',
    desc: 'Brand integrations in tournaments and esports events: custom overlays, in-stream mentions, pre-roll spots and live audience activations. From grassroots to major tournaments.',
    bullets: ['Tournament sponsorship', 'Custom overlays & broadcast assets', 'Live audience activations'],
  },
];

const PROCESS = [
  { num: '01', t: 'Discovery', d: 'We analyse your brand, target audience, competition and business goals. Clear KPIs before we start.' },
  { num: '02', t: 'Matching',  d: 'We select creators whose audience and style match your brand. No generic outreach — every creator selected and vetted.' },
  { num: '03', t: 'Execution', d: 'Full campaign coordination: briefings, content review, scheduling, compliance and publishing.' },
  { num: '04', t: 'Reporting', d: 'Reports with real metrics: reach, engagement, conversions and ROI. Verified data, not screenshots.' },
];

const FAQ = [
  { q: 'Which platforms do you cover?', a: 'Twitch and YouTube as primary platforms for streamers (CS2, Valorant, iGaming and esports). We also coordinate Instagram, TikTok and X for amplification across the Spanish-speaking market.' },
  { q: 'How fast can a campaign launch?', a: 'From brief to live in under 72 hours for our verified roster. For larger multi-creator campaigns, allow 5–7 working days for production.' },
  { q: 'Do you handle iGaming compliance?', a: 'Yes. SocialPro integrates DGOJ compliance for Spanish operators and adapts to LatAm regulatory frameworks for international campaigns. Disclaimers, age verification and pre-publication review are standard.' },
  { q: 'How do you measure ROI?', a: 'Each creator gets a unique tracking code or affiliate link. We attribute clicks, registrations and FTDs (First Time Deposits) per creator. Reports use raw data verified with the operator.' },
  { q: 'What size of campaigns do you run?', a: 'From single-creator product seeding to multi-territory activations with 100+ streamers. Our 1WIN CS2 campaign reached 8M+ across Spain, Mexico, Argentina and Colombia in a single tournament.' },
];

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  '@id': absoluteUrl('/services'),
  name: 'SocialPro — Gaming Marketing Agency',
  description: 'Performance influencer marketing for gaming, esports and iGaming brands in Spain and LatAm.',
  url: absoluteUrl('/services'),
  inLanguage: 'en',
  telephone: '+34-604-868-426',
  email: 'marketing@socialpro.es',
  priceRange: '$$',
  provider: { '@type': 'Organization', name: 'SocialPro', url: SITE_URL },
  areaServed: ['España', 'México', 'Argentina', 'Colombia', 'Chile'],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Gaming marketing services',
    itemListElement: SERVICES.map((s, i) => ({
      '@type': 'Offer',
      position: i + 1,
      itemOffered: { '@type': 'Service', name: s.title, description: s.desc },
    })),
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
};

export default function ServicesEnPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(serviceJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />

      {/* Hero */}
      <section className="bg-sp-black pt-32 pb-16 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-4">Services</p>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-tight mb-6">
            iGaming & gaming influencer marketing —<br /><span style={g}>verified FTDs, not estimated reach</span>
          </h1>
          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto">
            You&apos;ve run influencer campaigns where results were screenshots. We work differently:
            every FTD, click and registration attributed to the exact streamer who generated it —
            verified with operator data, not our estimates.
          </p>
        </div>
      </section>

      {/* Services grid */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">What we do</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-10">Full-spectrum gaming marketing</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {SERVICES.map((s) => (
              <div key={s.title} className="rounded-2xl border border-sp-border bg-sp-off p-6">
                <h3 className="font-display text-base font-black uppercase text-sp-dark mb-3">{s.title}</h3>
                <p className="text-sm text-sp-muted leading-relaxed mb-4">{s.desc}</p>
                <ul className="space-y-1.5">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-xs text-sp-muted">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sp-orange shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="bg-sp-off py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">How we work</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-10">From brief to results in 4 phases</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PROCESS.map((p) => (
              <div key={p.num} className="rounded-2xl border border-sp-border bg-white p-6">
                <div className="font-display text-3xl font-black mb-3" style={g}>{p.num}</div>
                <h3 className="font-display text-base font-black uppercase text-sp-dark mb-2">{p.t}</h3>
                <p className="text-sm text-sp-muted leading-relaxed">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specialties */}
      <nav aria-label="Specialties" className="bg-white border-t border-sp-border py-8">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-sp-muted mb-4">Specialties</p>
          <div className="flex flex-wrap gap-2">
            {[
              { href: '/cs2-influencer-marketing',    label: 'CS2 Influencer Marketing' },
              { href: '/valorant-influencers-agency', label: 'Valorant Influencers Agency' },
              { href: '/esports-marketing-agency',    label: 'Esports Marketing Agency' },
              { href: '/twitch-streamers-agency',     label: 'Twitch Streamers Agency' },
              { href: '/betting-influencers',         label: 'Betting Influencers' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="text-xs font-semibold text-sp-muted hover:text-sp-orange border border-sp-border hover:border-sp-orange rounded-full px-3 py-1.5 transition-colors">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* FAQ */}
      <section className="bg-sp-off py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">FAQ</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-10">Common questions</h2>
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
      <section className="bg-sp-black py-16 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-3xl md:text-4xl font-black uppercase text-white mb-4">
            Tell us about your <span style={g}>next campaign</span>
          </h2>
          <p className="text-white/60 mb-8">Send us your product, target market and goal. We deliver a tailored proposal in 48 hours.</p>
          <Link href="/contact" className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity">
            Tell us about your campaign
          </Link>
        </div>
      </section>
    </>
  );
}
