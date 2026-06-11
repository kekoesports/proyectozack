import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';
import Link from 'next/link';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';
import { TrackedCtaLink } from '@/components/ui/TrackedCtaLink';
import { buildBreadcrumbJsonLd } from '@/lib/utils/breadcrumbs';

export const metadata: Metadata = {
  title: 'CS2 Influencer Marketing Agency — Spain & LatAm',
  description:
    'CS2 influencer marketing agency specializing in Counter-Strike 2 streamers across Spain and LatAm. FTD tracking, verified audiences, activation in <72h.',
  alternates: {
    canonical: '/cs2-influencer-marketing',
    languages: {
      en: absoluteUrl('/cs2-influencer-marketing'),
          'x-default': absoluteUrl('/cs2-influencer-marketing'),
      es: absoluteUrl('/influencers-cs2'),
    },
  },
  openGraph: {
    title: 'CS2 Influencer Marketing Agency — Spain & LatAm | SocialPro',
    description:
      'Counter-Strike 2 influencer marketing with verified streamers. FTD tracking and ROI-focused campaigns in Spain and LatAm.',
    url: absoluteUrl('/cs2-influencer-marketing'),
    type: 'website',
    images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630, alt: 'CS2 Influencer Marketing Agency — SocialPro' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CS2 Influencer Marketing Agency | SocialPro',
    description: 'CS2 influencer marketing with FTD tracking. Spain & LatAm. Activation in <72h.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

const g = { background: 'linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%)', WebkitBackgroundClip: 'text' as const, WebkitTextFillColor: 'transparent' as const, backgroundClip: 'text' as const };

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'CS2 Influencer Marketing',
  serviceType: 'Esports Influencer Marketing',
  inLanguage: 'en',
  provider: { '@type': 'Organization', '@id': absoluteUrl('/#organization'), name: 'SocialPro', url: SITE_URL },
  areaServed: ['España', 'México', 'Argentina', 'Colombia', 'Chile'],
  description: 'CS2 influencer marketing campaigns with verified streamers across Spain and LatAm. FTD tracking, compliance and activation in under 72 hours.',
};

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: 'Servicios', url: absoluteUrl('/servicios') },
  { name: 'CS2 Influencer Marketing', url: absoluteUrl('/cs2-influencer-marketing') },
]);


const STATS = [
  { stat: '8M+', label: 'Reach on 1WIN CS2 campaign' },
  { stat: '+340', label: 'FTDs in a single activation' },
  { stat: '100+', label: 'Streamers in one campaign' },
  { stat: '<72h', label: 'Brief to live campaign' },
];

const WHY = [
  { title: 'Highest purchase intent in gaming', desc: 'CS2 players live in a transaction economy. Skin trading, case openings, betting — they convert at rates 3-5x above general gaming audiences. Peripheral brands, iGaming and skins platforms see this firsthand.' },
  { title: 'Live content that builds trust', desc: 'CS2 streams run for hours, not minutes. Viewers watch their favourite player genuinely using your product. That\'s brand exposure you can\'t buy in a pre-roll ad.' },
  { title: 'Precision attribution per creator', desc: 'Every streamer gets a unique code. We track every click, register and deposit back to the exact creator who generated it. Verified reports, not estimates.' },
];

const FAQ_ITEMS = [
  {
    q: 'Why does the CS2 audience convert better than general gaming audiences?',
    a: 'CS2 players live in a transaction economy. Skin trading, case openings, betting — they convert at rates 3-5x above general gaming audiences. Peripheral brands, iGaming and skins platforms see this firsthand.',
  },
  {
    q: 'How quickly can a CS2 influencer campaign go live?',
    a: 'From brief confirmation to live campaign in under 72 hours. We deliver a proposal with selected CS2 streamers in 48 hours — tell us your product, conversion goal and target market.',
  },
  {
    q: 'How is attribution tracked per CS2 streamer?',
    a: 'Every streamer gets a unique code. We track every click, register and deposit back to the exact creator who generated it. Verified reports, not estimates.',
  },
  {
    q: 'Which markets does SocialPro cover for CS2 campaigns?',
    a: 'Spain, Mexico, Argentina and Colombia. Our 1WIN CS2 Tournament campaign activated 100+ streamers simultaneously across all four markets, with peak audiences exceeding 500K concurrent viewers.',
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': absoluteUrl('/cs2-influencer-marketing#faq'),
  mainEntity: FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
};

export default function Cs2InfluencerMarketingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />

      {/* Hero */}
      <section className="bg-sp-black pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-4">CS2 Influencer Marketing Agency</p>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-tight mb-6">
            CS2 Influencer Marketing —<br /><span style={g}>The Audience That Converts</span>
          </h1>
          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto mb-10">
            CS2 influencer marketing with verified streamers across Spain and LatAm.
            FTD tracking, compliance and activation in under 72 hours.
          </p>
          <div className="flex flex-wrap justify-center gap-8 mb-10">
            {STATS.map(({ stat, label }) => (
              <div key={label} className="text-center">
                <div className="font-display text-3xl font-black" style={g}>{stat}</div>
                <div className="text-xs text-white/40 mt-1 max-w-[130px]">{label}</div>
              </div>
            ))}
          </div>
          <TrackedCtaLink href="/contact?type=brand" ctaId="landing_cs2_en_hero" className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity">

            Launch your CS2 campaign
          </TrackedCtaLink>
        </div>
      </section>

      {/* Why CS2 */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Why CS2</p>
          <h2 className="font-display text-3xl md:text-4xl font-black uppercase text-sp-dark mb-10">
            Not all gaming audiences are equal
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {WHY.map((w) => (
              <div key={w.title} className="rounded-2xl border border-sp-border bg-sp-off p-6">
                <h3 className="font-display text-base font-black uppercase text-sp-dark mb-3">{w.title}</h3>
                <p className="text-sm text-sp-muted leading-relaxed">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="bg-sp-off py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Proven results</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-8">CS2 campaigns that delivered</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-sp-border p-8">
              <div className="font-display text-4xl font-black text-sp-dark mb-1">8M+</div>
              <div className="text-sp-orange text-xs font-bold uppercase tracking-wider mb-3">1WIN · CS2 Tournament</div>
              <p className="text-sm text-sp-muted leading-relaxed">Multi-territory campaign activating 100+ streamers simultaneously across Spain, Mexico, Argentina and Colombia. Integrated into a live CS2 tournament with peak audiences exceeding 500K concurrent viewers.</p>
            </div>
            <div className="bg-white rounded-2xl border border-sp-border p-8">
              <div className="font-display text-4xl font-black text-sp-dark mb-1">200K€</div>
              <div className="text-sp-orange text-xs font-bold uppercase tracking-wider mb-3">SkinsMonkey · Tracked conversions</div>
              <p className="text-sm text-sp-muted leading-relaxed">6-week campaign with unique referral codes per streamer. €200,000 in transactions directly attributed to SocialPro creators. Every conversion tracked end-to-end with verifiable data.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">FAQ</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-10">Frequently asked questions</h2>
          <div className="space-y-8">
            {FAQ_ITEMS.map((item) => (
              <div key={item.q} className="border-b border-sp-border pb-8 last:border-b-0">
                <h3 className="font-bold text-sp-dark mb-3">{item.q}</h3>
                <p className="text-sm text-sp-muted leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-sp-black py-16 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-3xl font-black uppercase text-white mb-4">
            Ready to activate your <span style={g}>CS2 campaign?</span>
          </h2>
          <p className="text-white/50 mb-8">Tell us your product, conversion goal and target market. We deliver a proposal with selected CS2 streamers in 48 hours.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact?type=brand" className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity">Request proposal</Link>
            <Link href="/influencers-cs2" className="inline-block border border-white/20 text-white/60 font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:border-white/40 hover:text-white transition-colors">Ver en español →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
