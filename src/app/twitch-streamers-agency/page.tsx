import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';
import Link from 'next/link';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';
import { buildBreadcrumbJsonLd } from '@/lib/utils/breadcrumbs';

export const metadata: Metadata = {
  title: 'Twitch Streamers Agency — Live Gaming Influencer Marketing',
  description:
    'Twitch streamers agency for brand campaigns in Spain and LatAm. Live gaming influencer marketing with verified audiences, real-time engagement and performance tracking.',
  alternates: {
    canonical: '/twitch-streamers-agency',
    languages: {
      en: absoluteUrl('/twitch-streamers-agency'),
      'x-default': absoluteUrl('/twitch-streamers-agency'),
    },
  },
  openGraph: {
    title: 'Twitch Streamers Agency — Live Gaming Influencer Marketing | SocialPro',
    description: 'Twitch streamers agency in Spain & LatAm. Live influencer marketing with verified audiences, engagement tracking and ROI-focused campaigns.',
    url: absoluteUrl('/twitch-streamers-agency'),
    type: 'website',
    images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630, alt: 'Twitch Streamers Agency — Live Gaming Influencer Marketing | SocialPro' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Twitch Streamers Agency | SocialPro',
    description: 'Twitch streamers agency Spain & LatAm. Live gaming influencer marketing with verified audiences.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

const g = { background: 'linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%)', WebkitBackgroundClip: 'text' as const, WebkitTextFillColor: 'transparent' as const, backgroundClip: 'text' as const };

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Twitch Streamers Agency',
  serviceType: 'Live Gaming Influencer Marketing',
  inLanguage: 'en',
  provider: { '@type': 'Organization', name: 'SocialPro', url: SITE_URL },
  areaServed: ['España', 'México', 'Argentina', 'Colombia', 'Chile'],
  description: 'Twitch streamers agency for live gaming influencer campaigns in Spain and LatAm. Verified audiences, real-time engagement and performance-tracked campaigns.',
};

const breadcrumbJsonLd = buildBreadcrumbJsonLd([{ name: 'Servicios', url: absoluteUrl('/servicios') }, { name: 'Twitch Streamers Agency', url: absoluteUrl('/twitch-streamers-agency') }]);

const STATS = [
  { stat: '15M+', label: 'Monthly views across roster' },
  { stat: '4h+', label: 'Average session time on Twitch' },
  { stat: '86', label: 'Twitch creators in network' },
  { stat: '<72h', label: 'Brief to live activation' },
];

const TWITCH_ADVANTAGES = [
  { title: 'Sustained brand exposure', desc: 'Twitch viewers don\'t watch for 30 seconds — they watch for hours. Your brand appears repeatedly throughout a live session, building genuine recall that short-form content cannot replicate.' },
  { title: 'Community trust at scale', desc: 'Streamers build intimate relationships with their communities over months and years. When they recommend your brand live on stream, it carries the weight of a personal endorsement — not an ad.' },
  { title: 'Real-time interaction with your audience', desc: 'Twitch chat creates immediate, measurable audience reactions to brand integrations. Viewers respond in real time, ask questions and engage directly. It\'s focus group data that scales.' },
  { title: 'Live events and activations', desc: 'Twitch is the natural home for tournaments, product launches, exclusive reveals and interactive campaigns. We design activations that use the platform\'s live mechanics to maximise impact.' },
];

export default function TwitchStreamersAgencyPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />

      <section className="bg-sp-black pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-4">Twitch Streamers Agency</p>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-tight mb-6">
            Twitch Streamers Agency<br /><span style={g}>Live. Trusted. Measured.</span>
          </h1>
          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto mb-10">
            Live gaming influencer marketing with Twitch streamers across Spain and LatAm.
            Verified audiences, sustained brand exposure and conversion tracking from day one.
          </p>
          <div className="flex flex-wrap justify-center gap-8 mb-10">
            {STATS.map(({ stat, label }) => (
              <div key={label} className="text-center">
                <div className="font-display text-3xl font-black" style={g}>{stat}</div>
                <div className="text-xs text-white/40 mt-1 max-w-[130px]">{label}</div>
              </div>
            ))}
          </div>
          <Link href="/contact?type=brand" className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity">
            Activate Twitch campaign
          </Link>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">The Twitch difference</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-10">Live means deeper. Deeper means better ROI.</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {TWITCH_ADVANTAGES.map((a) => (
              <div key={a.title} className="rounded-2xl border border-sp-border bg-sp-off p-6">
                <h3 className="font-display text-base font-black uppercase text-sp-dark mb-3">{a.title}</h3>
                <p className="text-sm text-sp-muted leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-sp-off py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">What we activate</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-8">Twitch campaign formats</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { t: 'Sponsored stream sessions', d: 'Branded segments integrated naturally into a live stream. Product mentions, on-screen overlays and interactive chat moments.' },
              { t: 'Twitch tournaments', d: 'Custom tournaments with your brand as presenting sponsor. Full production, custom visuals and live audience of thousands.' },
              { t: 'Product launch streams', d: 'Exclusive live reveals with pre-selected streamers. Real-time audience reactions and immediate conversion tracking.' },
            ].map(({ t, d }) => (
              <div key={t} className="bg-white rounded-2xl border border-sp-border p-5">
                <h3 className="font-display text-sm font-black uppercase text-sp-dark mb-2">{t}</h3>
                <p className="text-sm text-sp-muted leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-sp-black py-16 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-3xl font-black uppercase text-white mb-4">Your brand. <span style={g}>Live on Twitch.</span></h2>
          <p className="text-white/50 mb-8">Tell us your brand, target audience and campaign goal. We match you with the right Twitch streamers and deliver a proposal in 48 hours.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact?type=brand" className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity">Get a proposal</Link>
            <Link href="/talents" className="inline-block border border-white/20 text-white/60 font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:border-white/40 hover:text-white transition-colors">View our streamers →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
