import Link from 'next/link';
import type { Locale } from '@/lib/locale';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';
import { safeJsonLd } from '@/lib/safeJsonLd';
import { buildBreadcrumbJsonLd } from '@/lib/utils/breadcrumbs';
import { TwitchRosterProof } from '@/components/sections/TwitchRosterProof';
import { TWITCH_COPY, TWITCH_PATHS } from './landing-content';
import { TwitchTrackedLink } from './TwitchTrackedLink';

const ctaClass = 'inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity';
const gradient = { background: 'linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' };

export function TwitchLanding({ locale }: { readonly locale: Locale }) {
  const copy = TWITCH_COPY[locale];
  const es = locale === 'es';
  const pagePath = TWITCH_PATHS[locale];
  const contactHref = `${es ? '/contacto' : '/contact'}?type=brand&source=${pagePath.slice(1)}`;
  const schemas = [
    { '@context': 'https://schema.org', '@type': 'Service', name: copy.h1, serviceType: es ? 'Influencer marketing en Twitch' : 'Live Gaming Influencer Marketing', inLanguage: locale, url: absoluteUrl(pagePath), provider: { '@type': 'Organization', '@id': absoluteUrl('/#organization'), name: 'SocialPro', url: SITE_URL }, areaServed: ['España', 'México', 'Argentina', 'Colombia', 'Chile'], description: copy.description },
    buildBreadcrumbJsonLd([{ name: es ? 'Servicios' : 'Services', url: absoluteUrl(es ? '/servicios' : '/services') }, { name: copy.h1, url: absoluteUrl(pagePath) }]),
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: copy.faqs.map(({ question, answer }) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })) },
  ];

  return (
    <>
      {/* safeJsonLd escapes script-breaking characters in all structured output. */}
      {schemas.map((schema, index) => <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />)}
      <section className="bg-sp-black pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-4">Twitch · SocialPro</p>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-tight mb-6">{copy.h1}</h1>
          <p className="font-display text-3xl md:text-4xl font-black uppercase mb-6" style={gradient}>{copy.subtitle}</p>
          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto mb-10">{copy.intro}</p>
          <TwitchTrackedLink href={contactHref} event="twitch_proposal_click" placement="hero" pagePath={pagePath} language={locale} className={ctaClass}>{copy.heroCta}</TwitchTrackedLink>
        </div>
      </section>
      <TwitchRosterProof locale={locale} />
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">{copy.advantagesLabel}</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-10">{copy.advantagesTitle}</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {copy.advantages.map(({ title, desc }) => <div key={title} className="rounded-2xl border border-sp-border bg-sp-off p-6"><h3 className="font-display text-base font-black uppercase text-sp-dark mb-3">{title}</h3><p className="text-sm text-sp-muted leading-relaxed">{desc}</p></div>)}
          </div>
        </div>
      </section>
      <section className="bg-sp-off py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">{copy.formatsLabel}</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-8">{copy.formatsTitle}</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {copy.formats.map(({ title, desc }) => <div key={title} className="bg-white rounded-2xl border border-sp-border p-5"><h3 className="font-display text-sm font-black uppercase text-sp-dark mb-2">{title}</h3><p className="text-sm text-sp-muted leading-relaxed">{desc}</p></div>)}
          </div>
        </div>
      </section>
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-8">{copy.faqTitle}</h2>
          <div className="space-y-6">{copy.faqs.map(({ question, answer }) => <div key={question}><h3 className="font-display text-xl font-bold text-sp-dark mb-2">{question}</h3><p className="text-sm text-sp-muted leading-relaxed">{answer}</p></div>)}</div>
        </div>
      </section>
      <section className="bg-sp-off border-t border-sp-border py-10">
        <div className="max-w-3xl mx-auto px-6 text-sm text-sp-muted leading-relaxed space-y-3">
          <p>{copy.relatedIntro}</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">{copy.related.map(({ href, label }) => <li key={href}><Link href={href} className="font-semibold text-sp-orange hover:underline">{label}</Link></li>)}</ul>
        </div>
      </section>
      <section className="bg-sp-black py-16 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-3xl font-black uppercase text-white mb-4">{copy.finalTitle}</h2>
          <p className="text-white/50 mb-8">{copy.finalText}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <TwitchTrackedLink href={contactHref} event="twitch_proposal_click" placement="bottom" pagePath={pagePath} language={locale} className={ctaClass}>{copy.proposal}</TwitchTrackedLink>
            <Link href={es ? '/talentos' : '/talents'} className="inline-block border border-white/20 text-white/60 font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:border-white/40 hover:text-white transition-colors">{copy.roster}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
