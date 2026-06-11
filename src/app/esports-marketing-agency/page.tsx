import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';
import Link from 'next/link';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';
import { buildBreadcrumbJsonLd } from '@/lib/utils/breadcrumbs';
import { TrackedCtaLink } from '@/components/ui/TrackedCtaLink';

export const metadata: Metadata = {
  title: 'Esports Marketing Agency — Spain & LatAm Performance Marketing',
  description:
    'Esports marketing agency with 13+ years in Spain and LatAm. Influencer campaigns, tournament sponsorships and creator management for endemic and non-endemic brands.',
  alternates: {
    canonical: '/esports-marketing-agency',
    languages: {
      en: absoluteUrl('/esports-marketing-agency'),
      'x-default': absoluteUrl('/agencia-marketing-esports'),
      es: absoluteUrl('/agencia-marketing-esports'),
    },
  },
  openGraph: {
    title: 'Esports Marketing Agency — Spain & LatAm | SocialPro',
    description: 'Esports marketing in Spain and LatAm. 13+ years, 15M+ views/month, performance-focused campaigns for endemic and non-endemic brands.',
    url: absoluteUrl('/esports-marketing-agency'),
    type: 'website',
    images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630, alt: 'Esports Marketing Agency Spain & LatAm — SocialPro' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Esports Marketing Agency | SocialPro',
    description: 'Esports marketing agency Spain & LatAm. 13+ years, performance-focused, verified results.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

const g = { background: 'linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%)', WebkitBackgroundClip: 'text' as const, WebkitTextFillColor: 'transparent' as const, backgroundClip: 'text' as const };

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  name: 'SocialPro — Esports Marketing Agency',
  serviceType: 'Esports Marketing Agency',
  inLanguage: 'en',
  provider: { '@type': 'Organization', '@id': absoluteUrl('/#organization'), name: 'SocialPro', url: SITE_URL },
  foundingDate: '2012',
  areaServed: ['España', 'México', 'Argentina', 'Colombia', 'Chile'],
  description: 'Esports marketing agency operating in Spain and LatAm since 2012. Influencer campaigns, tournament activations and creator management with performance tracking.',
};

const breadcrumbJsonLd = buildBreadcrumbJsonLd([{ name: 'Servicios', url: absoluteUrl('/servicios') }, { name: 'Esports Marketing Agency', url: absoluteUrl('/esports-marketing-agency') }]);

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What makes SocialPro different from other esports marketing agencies?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'SocialPro has been in gaming since 2012 — before "esports marketing" was a category. We know the culture, the audiences and the platforms inside out. Every campaign has measurable KPIs: reach, engagement, conversions and ROI. No vanity metrics, no estimated reach — verified data only. Spain and LatAm represent one of the world\'s largest non-English gaming audiences, and our creator network gives brands direct, authentic access.',
      },
    },
    {
      '@type': 'Question',
      name: 'What services does an esports marketing agency provide?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'An esports marketing agency like SocialPro provides: influencer campaigns — streamer and creator activations for brand awareness, product launches and conversion-focused campaigns, with every creator verified and every metric tracked; tournament sponsorship — brand integrations in esports tournaments with custom overlays, in-stream mentions and live activations; creator management — full talent management including deal negotiation, content strategy and channel growth; and iGaming esports campaigns combining esports audiences with iGaming mechanics including FTD tracking and compliance.',
      },
    },
  ],
};

const STATS = [
  { stat: '13+', label: 'Years in esports marketing' },
  { stat: '15M+', label: 'Monthly views across roster' },
  { stat: '3', label: 'Active markets (ES, LatAm, TR)' },
  { stat: '100+', label: 'Campaign activations' },
];

const SERVICES = [
  { title: 'Influencer campaigns', desc: 'Streamer and creator activations for brand awareness, product launches and conversion-focused campaigns. Every creator is verified, every metric is tracked.' },
  { title: 'Tournament sponsorship', desc: 'Brand integrations in esports tournaments — from grassroots to major events. Custom overlays, in-stream mentions, pre-roll spots and live activations.' },
  { title: 'Creator management', desc: 'Full talent management for gaming creators: deal negotiation, content strategy, sponsorship management and channel growth. We manage the relationship so brands and creators can focus on results.' },
  { title: 'iGaming esports campaigns', desc: 'Specialized campaigns combining esports audiences with iGaming mechanics. CS2 tournaments with betting integrations, FTD tracking and DGOJ compliance built in.' },
];

export default function EsportsMarketingAgencyPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />

      <section className="bg-sp-black pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-4">Esports Marketing Agency</p>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-tight mb-6">
            Esports Marketing Agency<br /><span style={g}>Built on 13 Years of Results</span>
          </h1>
          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto mb-10">
            Esports marketing agency in Spain and LatAm since 2012.
            Influencer campaigns, tournament activations and creator management — all performance-driven.
          </p>
          <div className="flex flex-wrap justify-center gap-8 mb-10">
            {STATS.map(({ stat, label }) => (
              <div key={label} className="text-center">
                <div className="font-display text-3xl font-black" style={g}>{stat}</div>
                <div className="text-xs text-white/40 mt-1 max-w-[130px]">{label}</div>
              </div>
            ))}
          </div>
          <TrackedCtaLink href="/contact?type=brand" ctaId="landing_esports_en_hero" className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity">

            Work with us
          </TrackedCtaLink>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Services</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-10">Full-spectrum esports marketing</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {SERVICES.map((s) => (
              <div key={s.title} className="rounded-2xl border border-sp-border bg-sp-off p-6">
                <h3 className="font-display text-base font-black uppercase text-sp-dark mb-3">{s.title}</h3>
                <p className="text-sm text-sp-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-sp-black py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Why SocialPro</p>
          <h2 className="font-display text-3xl font-black uppercase text-white mb-8">Not a general agency. An esports agency.</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { t: 'Endemic expertise', d: 'We have been in gaming since 2012 — before "esports marketing" was a category. We know the culture, the audiences and the platforms inside out.' },
              { t: 'Performance focus', d: 'Every campaign has measurable KPIs: reach, engagement, conversions and ROI. No vanity metrics, no estimated reach — verified data only.' },
              { t: 'Spanish-speaking market', d: 'Spain and LatAm represent one of the world\'s largest non-English gaming audiences. Our creator network gives brands direct, authentic access.' },
            ].map(({ t, d }) => (
              <div key={t} className="border border-white/10 rounded-2xl p-5">
                <h3 className="font-display text-sm font-black uppercase text-white mb-2">{t}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-4">Ready to enter <span style={g}>esports?</span></h2>
          <p className="text-sp-muted mb-8">Whether you are an endemic brand or entering esports for the first time, we build the right activation for your goals and audience.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact?type=brand" className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity">Get a proposal</Link>
            <Link href="/agencia-marketing-esports" className="inline-block border border-sp-border text-sp-dark font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:border-sp-orange hover:text-sp-orange transition-colors">Ver en español →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
