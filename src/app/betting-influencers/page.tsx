import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';
import Link from 'next/link';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';
import { buildBreadcrumbJsonLd } from '@/lib/utils/breadcrumbs';
import { TrackedCtaLink } from '@/components/ui/TrackedCtaLink';

export const metadata: Metadata = {
  title: 'Betting Influencers Agency — Sports Betting & Casino Streamers',
  description:
    'Betting influencers agency with verified streamers for sports betting and online casino brands. DGOJ compliance, FTD tracking and ROI-verified campaigns in Spain, LatAm & Turkey.',
  alternates: {
    canonical: '/betting-influencers',
    languages: {
      en: absoluteUrl('/betting-influencers'),
      'x-default': absoluteUrl('/betting-influencers'),
      es: absoluteUrl('/servicios/igaming'),
    },
  },
  openGraph: {
    title: 'Betting Influencers Agency | SocialPro',
    description: 'Verified betting influencers and casino streamers. DGOJ compliance, FTD tracking. Spain, LatAm & Turkey.',
    url: absoluteUrl('/betting-influencers'),
    type: 'website',
    images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Betting Influencers Agency | SocialPro',
    description: 'Betting influencers with DGOJ compliance and FTD tracking. Spain, LatAm & Turkey.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

const g = { background: 'linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%)', WebkitBackgroundClip: 'text' as const, WebkitTextFillColor: 'transparent' as const, backgroundClip: 'text' as const };

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Betting Influencers Agency',
  serviceType: 'iGaming Influencer Marketing',
  inLanguage: 'en',
  provider: { '@type': 'Organization', '@id': absoluteUrl('/#organization'), name: 'SocialPro', url: SITE_URL },
  areaServed: ['España', 'México', 'Argentina', 'Colombia', 'Chile', 'Turquía'],
  description: 'Betting influencer marketing agency with verified sports betting and casino streamers. DGOJ compliance, FTD tracking and ROI-verified campaigns.',
};

const breadcrumbJsonLd = buildBreadcrumbJsonLd([{ name: 'Servicios', url: absoluteUrl('/servicios') }, { name: 'Betting Influencers', url: absoluteUrl('/betting-influencers') }]);

const STATS = [
  { stat: '+340', label: 'FTDs in a single activation' },
  { stat: '200K€', label: 'Tracked conversions (SkinsMonkey)' },
  { stat: '8M+', label: 'Reach on 1WIN campaign' },
  { stat: '4+', label: 'Years in iGaming influencer marketing' },
];

const DIFFERENTIATORS = [
  { title: 'Compliance-first, not compliance-last', desc: 'Most agencies connect streamers with betting brands and hope for the best. We build compliance into every step: creator vetting, content briefing, pre-publication review and regulatory reporting.' },
  { title: 'FTD tracking that operators can audit', desc: 'Every conversion — registration, deposit, FTD — is attributed to the exact streamer who generated it. No estimates, no screenshots. Raw data you can audit.' },
  { title: '4 years of iGaming execution', desc: 'We have been running betting influencer campaigns in Spain, LatAm and Turkey since 2020. We know which creators deliver, which messages work and where the regulatory lines are.' },
];

const FAQ_ITEMS = [
  {
    q: 'Which markets do you activate betting influencer campaigns in?',
    a: 'We run betting influencer campaigns in Spain, LatAm and Turkey. We have been operating in these markets since 2020 and know which creators deliver, which messages work and where the regulatory lines are.',
  },
  {
    q: 'How does DGOJ compliance work in your betting campaigns?',
    a: 'Most agencies connect streamers with betting brands and hope for the best. We build compliance into every step: creator vetting, content briefing, pre-publication review and regulatory reporting.',
  },
  {
    q: 'How is FTD and conversion tracking verified?',
    a: 'Every conversion — registration, deposit, FTD — is attributed to the exact streamer who generated it. No estimates, no screenshots. Raw data you can audit.',
  },
  {
    q: 'What results have your betting influencer campaigns delivered?',
    a: 'In a 6-week SkinsMonkey campaign, SocialPro creators generated €200,000 in transactions attributed via unique referral codes per streamer. In a separate activation, 340+ First Time Deposits were tracked and attributed to specific streamers, verified with operator data — not projected estimates.',
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': absoluteUrl('/betting-influencers#faq'),
  mainEntity: FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
};

export default function BettingInfluencersPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />

      <section className="bg-sp-black pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-4">Betting Influencers Agency</p>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-tight mb-6">
            Betting Influencers<br /><span style={g}>That Actually Convert</span>
          </h1>
          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto mb-10">
            Sports betting and casino streamers in Spain, LatAm and Turkey.
            DGOJ compliance built in. FTD tracking from day one.
          </p>
          <div className="flex flex-wrap justify-center gap-8 mb-10">
            {STATS.map(({ stat, label }) => (
              <div key={label} className="text-center">
                <div className="font-display text-3xl font-black" style={g}>{stat}</div>
                <div className="text-xs text-white/40 mt-1 max-w-[140px]">{label}</div>
              </div>
            ))}
          </div>
          <TrackedCtaLink href="/contact" ctaId="landing_betting_en_hero" className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity">

            Activate betting campaign
          </TrackedCtaLink>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Why SocialPro</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-10">We don&apos;t just connect. We protect.</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {DIFFERENTIATORS.map((d) => (
              <div key={d.title} className="rounded-2xl border border-sp-border bg-sp-off p-6">
                <h3 className="font-display text-base font-black uppercase text-sp-dark mb-3">{d.title}</h3>
                <p className="text-sm text-sp-muted leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-sp-off py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Results</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-8">Betting campaigns with verifiable ROI</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-sp-border p-8">
              <div className="font-display text-4xl font-black text-sp-dark mb-1">200K€</div>
              <div className="text-sp-orange text-xs font-bold uppercase tracking-wider mb-3">SkinsMonkey · Direct conversions</div>
              <p className="text-sm text-sp-muted leading-relaxed">6-week betting campaign with unique referral code per streamer. €200,000 in transactions directly attributed to SocialPro creators. Positive ROI from week one.</p>
            </div>
            <div className="bg-white rounded-2xl border border-sp-border p-8">
              <div className="font-display text-4xl font-black text-sp-dark mb-1">+340</div>
              <div className="text-sp-orange text-xs font-bold uppercase tracking-wider mb-3">FTDs · Single activation</div>
              <p className="text-sm text-sp-muted leading-relaxed">340+ First Time Deposits tracked in a single campaign activation. Each attributed to a specific streamer, verified with operator data — not projected estimates.</p>
            </div>
          </div>
          <p className="text-sm text-sp-muted mt-6">For compliance details, see <Link href="/guia-dgoj-igaming-influencers" className="text-sp-orange hover:underline">our DGOJ compliance guide</Link>.</p>
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

      <section className="bg-sp-black py-16 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-3xl font-black uppercase text-white mb-4">Ready to launch your <span style={g}>betting campaign?</span></h2>
          <p className="text-white/50 mb-8">Tell us your operator, target market and conversion goal. We deliver a proposal with compliance included in 48 hours.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact" className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity">Request proposal</Link>
            <Link href="/servicios/igaming" className="inline-block border border-white/20 text-white/60 font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:border-white/40 hover:text-white transition-colors">Ver en español →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
