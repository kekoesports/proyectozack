import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  title: 'Valorant Influencers Agency — Spain & LatAm',
  description:
    'Valorant influencers agency connecting brands with verified streamers across Spain and LatAm. Brand-safe esports campaigns with real audience data and performance tracking.',
  alternates: {
    canonical: '/valorant-influencers-agency',
    languages: {
      en: absoluteUrl('/valorant-influencers-agency'),
      es: absoluteUrl('/agencia-influencers-valorant'),
    },
  },
  openGraph: {
    title: 'Valorant Influencers Agency — Spain & LatAm | SocialPro',
    description: 'Valorant influencer marketing with verified streamers. Brand-safe, performance-focused campaigns across the Spanish-speaking gaming market.',
    url: absoluteUrl('/valorant-influencers-agency'),
    type: 'website',
    images: [{ url: absoluteUrl('/og-default.jpg'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Valorant Influencers Agency | SocialPro',
    description: 'Valorant influencer marketing. Verified streamers across Spain & LatAm. Brand-safe, ROI-driven.',
    images: [absoluteUrl('/og-default.jpg')],
  },
};

const g = { background: 'linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%)', WebkitBackgroundClip: 'text' as const, WebkitTextFillColor: 'transparent' as const, backgroundClip: 'text' as const };

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Valorant Influencers Agency',
  serviceType: 'Esports Influencer Marketing',
  inLanguage: 'en',
  provider: { '@type': 'Organization', name: 'SocialPro', url: SITE_URL },
  areaServed: ['España', 'México', 'Argentina', 'Colombia', 'Chile'],
  description: 'Valorant influencer marketing campaigns with verified streamers in Spain and LatAm. Brand-safe content with real audience data and performance tracking.',
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'Why is Valorant valuable for brand campaigns?', acceptedAnswer: { '@type': 'Answer', text: 'Valorant attracts a younger, more diverse audience compared to CS2, including a significantly higher percentage of female gamers. The Riot Games ecosystem enforces content standards, making Valorant streamers inherently brand-safe. It\'s the fastest-growing FPS in LatAm.' } },
    { '@type': 'Question', name: 'What brands work well with Valorant influencers?', acceptedAnswer: { '@type': 'Answer', text: 'Valorant\'s demographic is ideal for lifestyle brands, energy drinks, gaming peripherals, sportswear, technology and consumer apps. The audience indexes high on youth culture, fashion and digital-first brands — different from the more transactional CS2 audience.' } },
    { '@type': 'Question', name: 'Is Valorant influencer marketing available in LatAm?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. SocialPro operates across Spain, Mexico, Argentina, Colombia and Chile. Valorant is particularly strong in LatAm — it is the dominant FPS title in most Spanish-speaking markets.' } },
  ],
};

const STATS = [
  { stat: '15M+', label: 'Monthly views across roster' },
  { stat: '13+', label: 'Years in gaming marketing' },
  { stat: '5', label: 'Markets in Spain & LatAm' },
  { stat: '<72h', label: 'From brief to live' },
];

const WHY = [
  { title: 'Broader, more diverse audience', desc: 'Valorant\'s player base skews younger and more gender-diverse than CS2 or traditional esports. Perfect for consumer brands wanting to reach gaming-native millennials and Gen Z without the hardcore barrier.' },
  { title: 'Brand-safe by design', desc: 'Riot Games enforces content standards across its ecosystem. Valorant streamers operate in a cleaner, more structured environment — reducing brand safety risks compared to unregulated gaming content.' },
  { title: 'LatAm\'s fastest-growing FPS', desc: 'Valorant is the dominant competitive FPS in most LatAm markets. Our Spanish-speaking creator network gives brands direct access to one of the world\'s largest non-English gaming audiences.' },
];

export default function ValorantInfluencersAgencyPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <section className="bg-sp-black pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-4">Valorant Influencers Agency</p>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-tight mb-6">
            Valorant Influencers<br /><span style={g}>That Move Brands</span>
          </h1>
          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto mb-10">
            Brand-safe Valorant influencer campaigns with verified streamers across Spain and LatAm.
            Real audience data. Performance-focused activation.
          </p>
          <div className="flex flex-wrap justify-center gap-8 mb-10">
            {STATS.map(({ stat, label }) => (
              <div key={label} className="text-center">
                <div className="font-display text-3xl font-black" style={g}>{stat}</div>
                <div className="text-xs text-white/40 mt-1 max-w-[130px]">{label}</div>
              </div>
            ))}
          </div>
          <Link href="/contacto" className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity">
            Work with Valorant streamers
          </Link>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Why Valorant</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-10">A different audience. A different opportunity.</h2>
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

      <section className="bg-sp-off py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">How we work</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-8">From brief to campaign in 3 steps</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { num: '01', t: 'Creator matching', d: 'We select Valorant streamers whose audience, content style and values align with your brand. No generic outreach — every selection is verified.' },
              { num: '02', t: 'Campaign execution', d: 'Full campaign coordination: briefings, content review, scheduling and publishing. Everything managed so you focus on results.' },
              { num: '03', t: 'Performance reporting', d: 'Real metrics: reach, engagement, conversions and ROI. Verified reports with raw data, delivered within 48h of campaign end.' },
            ].map((s) => (
              <div key={s.num} className="bg-white rounded-2xl border border-sp-border p-6">
                <div className="font-display text-3xl font-black mb-2" style={g}>{s.num}</div>
                <h3 className="font-display text-base font-black uppercase text-sp-dark mb-2">{s.t}</h3>
                <p className="text-sm text-sp-muted leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-sp-black py-16 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-3xl font-black uppercase text-white mb-4">Launch your <span style={g}>Valorant campaign</span></h2>
          <p className="text-white/50 mb-8">Tell us your brand, target audience and KPIs. We deliver a custom Valorant influencer proposal in 48 hours.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contacto" className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity">Request proposal</Link>
            <Link href="/agencia-influencers-valorant" className="inline-block border border-white/20 text-white/60 font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:border-white/40 hover:text-white transition-colors">Ver en español →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
