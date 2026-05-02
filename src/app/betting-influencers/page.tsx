import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  title: 'Betting Influencers Agency — Sports Betting & Casino Streamers',
  description:
    'Betting influencers agency with verified streamers for sports betting and online casino brands. DGOJ compliance, FTD tracking and ROI-verified campaigns in Spain, LatAm & Turkey.',
  alternates: {
    canonical: '/betting-influencers',
    languages: {
      en: absoluteUrl('/betting-influencers'),
          'x-default': absoluteUrl('/betting-influencers'),
      es: absoluteUrl('/influencers-betting'),
    },
  },
  openGraph: {
    title: 'Betting Influencers Agency | SocialPro',
    description: 'Verified betting influencers and casino streamers. DGOJ compliance, FTD tracking. Spain, LatAm & Turkey.',
    url: absoluteUrl('/betting-influencers'),
    type: 'website',
    images: [{ url: absoluteUrl('/og-default.jpg'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Betting Influencers Agency | SocialPro',
    description: 'Betting influencers with DGOJ compliance and FTD tracking. Spain, LatAm & Turkey.',
    images: [absoluteUrl('/og-default.jpg')],
  },
};

const g = { background: 'linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%)', WebkitBackgroundClip: 'text' as const, WebkitTextFillColor: 'transparent' as const, backgroundClip: 'text' as const };

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Betting Influencers Agency',
  serviceType: 'iGaming Influencer Marketing',
  inLanguage: 'en',
  provider: { '@type': 'Organization', name: 'SocialPro', url: SITE_URL },
  areaServed: ['España', 'México', 'Argentina', 'Colombia', 'Chile', 'Turquía'],
  description: 'Betting influencer marketing agency with verified sports betting and casino streamers. DGOJ compliance, FTD tracking and ROI-verified campaigns.',
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'What is a betting influencer?', acceptedAnswer: { '@type': 'Answer', text: 'A betting influencer is a streamer or content creator who promotes sports betting, online casino or iGaming brands to their audience. The most effective betting influencers come from the gaming community — their audience is already comfortable with digital transactions and high-stakes decisions.' } },
    { '@type': 'Question', name: 'How do you ensure compliance for betting influencer campaigns?', acceptedAnswer: { '@type': 'Answer', text: 'SocialPro integrates DGOJ compliance (Spain\'s gambling regulator) in every campaign: responsible gambling disclaimers in the first 30 seconds, age verification, prohibition of debt-solution messaging, and mandatory pre-publication content review. We adapt to each market\'s specific regulations.' } },
    { '@type': 'Question', name: 'What results can betting brands expect from influencer campaigns?', acceptedAnswer: { '@type': 'Answer', text: 'SocialPro has delivered €200,000 in tracked conversions for SkinsMonkey and 8M+ reach for 1WIN. FTD tracking ensures every deposit is attributed to the exact streamer who drove it. ROI is measurable from day one.' } },
    { '@type': 'Question', name: 'Do you work with international betting operators?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. We work with betting and casino operators licensed across Spain, LatAm (Mexico, Argentina, Colombia, Chile) and Turkey. Each market has its own regulatory framework — SocialPro handles compliance for all of them.' } },
  ],
};

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

export default function BettingInfluencersPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

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
          <Link href="/contacto" className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity">
            Activate betting campaign
          </Link>
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
          <p className="text-sm text-sp-muted mt-6">For compliance details, see <Link href="/servicios/igaming" className="text-sp-orange hover:underline">our iGaming compliance page</Link>.</p>
        </div>
      </section>

      <section className="bg-sp-black py-16 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-3xl font-black uppercase text-white mb-4">Ready to launch your <span style={g}>betting campaign?</span></h2>
          <p className="text-white/50 mb-8">Tell us your operator, target market and conversion goal. We deliver a proposal with compliance included in 48 hours.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contacto" className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity">Request proposal</Link>
            <Link href="/influencers-betting" className="inline-block border border-white/20 text-white/60 font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:border-white/40 hover:text-white transition-colors">Ver en español →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
