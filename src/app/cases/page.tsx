import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

import { getCaseStudies } from '@/lib/queries/cases';
import { absoluteUrl } from '@/lib/site-url';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Gaming Campaign Case Studies — Verified Results',
  description:
    'Real campaigns with verified results: 1WIN (8M+ reach), SkinsMonkey (200K+ in tracked conversions). Verified gaming marketing results and ROI.',
  alternates: {
    canonical: '/cases',
    languages: {
      en: absoluteUrl('/cases'),
      es: absoluteUrl('/casos'),
      'x-default': absoluteUrl('/cases'),
    },
  },
  openGraph: {
    title: 'Gaming Campaign Case Studies | SocialPro',
    description: '1WIN (8M+ reach), SkinsMonkey (200K+ in tracked conversions). Verified gaming marketing results.',
    url: absoluteUrl('/cases'),
    images: [{ url: absoluteUrl('/og-default.jpg'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gaming Campaign Case Studies | SocialPro',
    description: '1WIN (8M+ reach), SkinsMonkey (200K+ in tracked conversions). Verified gaming marketing results.',
    images: [absoluteUrl('/og-default.jpg')],
  },
};

const g = {
  background: 'linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%)',
  WebkitBackgroundClip: 'text' as const,
  WebkitTextFillColor: 'transparent' as const,
  backgroundClip: 'text' as const,
};

export default async function CasesEnPage() {
  const cases = await getCaseStudies();

  return (
    <>
      {/* Hero */}
      <section className="bg-sp-black pt-32 pb-16 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-4">Case studies</p>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-tight mb-6">
            Gaming campaigns with<br /><span style={g}>verified results</span>
          </h1>
          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto">
            Real numbers, real attribution. Reach, conversions and ROI tracked with raw data — not estimates.
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-6">
          {cases.length === 0 ? (
            <p className="text-center text-sp-muted">No case studies published yet.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cases.map((c) => (
                <Link
                  key={c.id}
                  href={`/casos/${c.slug}`}
                  className="group block rounded-2xl border border-sp-border bg-sp-off overflow-hidden hover:border-sp-orange transition-colors"
                >
                  {c.heroImageUrl && (
                    <div className="relative aspect-video bg-sp-dark/5 overflow-hidden">
                      <Image src={c.heroImageUrl} alt={c.title} fill sizes="(max-width:768px) 100vw, (max-width:1024px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  )}
                  <div className="p-6">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-sp-orange mb-2">{c.brandName}</p>
                    <h2 className="font-display text-lg font-black uppercase text-sp-dark mb-3 group-hover:text-sp-orange transition-colors">{c.title}</h2>
                    {c.reach && <p className="font-display text-3xl font-black mb-2" style={g}>{c.reach}</p>}
                    {c.excerpt && <p className="text-sm text-sp-muted leading-relaxed mb-4">{c.excerpt}</p>}
                    <div className="flex flex-wrap gap-2 text-[11px] text-sp-muted/80">
                      {c.engagementRate && <span className="px-2 py-0.5 rounded-full bg-white border border-sp-border">{c.engagementRate} eng.</span>}
                      {c.conversions    && <span className="px-2 py-0.5 rounded-full bg-white border border-sp-border">{c.conversions}</span>}
                      {c.roiMultiplier  && <span className="px-2 py-0.5 rounded-full bg-white border border-sp-border">{c.roiMultiplier} ROI</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-sp-black py-16 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-3xl md:text-4xl font-black uppercase text-white mb-4">
            Want results like <span style={g}>these?</span>
          </h2>
          <p className="text-white/60 mb-8">Tell us your brand, target market and conversion goal. We deliver a custom proposal in 48 hours.</p>
          <Link href="/contact" className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity">
            Request a proposal
          </Link>
        </div>
      </section>
    </>
  );
}
