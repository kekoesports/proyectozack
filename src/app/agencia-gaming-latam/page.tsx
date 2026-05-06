import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';
import { TrackedCtaLink } from '@/components/ui/TrackedCtaLink';
import { StickyCtaMobile } from '@/components/ui/StickyCtaMobile';

export const metadata: Metadata = {
  title: 'Agencia Gaming LATAM — Influencers México, Argentina, Colombia, Chile',
  description:
    'Agencia especializada en gaming e iGaming para LATAM. Gestionamos campañas con streamers y creadores en México, Argentina, Colombia y Chile. FTD tracking, compliance y 13+ años de experiencia.',
  alternates: { canonical: '/agencia-gaming-latam' },
  openGraph: {
    title: 'Agencia Gaming LATAM | SocialPro',
    description: 'Campañas gaming e iGaming con creadores en México, Argentina, Colombia y Chile. 13+ años, resultados medibles.',
    url: absoluteUrl('/agencia-gaming-latam'),
    type: 'website',
    images: [{ url: absoluteUrl('/og-default.jpg'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agencia Gaming LATAM | SocialPro',
    description: 'Campañas gaming e iGaming con creadores en LATAM. Resultados verificados.',
    images: [absoluteUrl('/og-default.jpg')],
  },
};

const g = { background: 'linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%)', WebkitBackgroundClip: 'text' as const, WebkitTextFillColor: 'transparent' as const, backgroundClip: 'text' as const };

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  name: 'SocialPro — Agencia Gaming LATAM',
  serviceType: 'Gaming & iGaming Influencer Marketing Agency',
  inLanguage: 'es',
  provider: { '@type': 'Organization', '@id': absoluteUrl('/#organization'), name: 'SocialPro', url: SITE_URL },
  foundingDate: '2012',
  areaServed: ['México', 'Argentina', 'Colombia', 'Chile', 'Perú', 'España'],
  description: 'Agencia gaming e iGaming para LATAM desde 2012. Campañas con streamers y creadores en México, Argentina, Colombia y Chile con resultados verificados y FTD tracking.',
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '¿Qué mercados de LATAM cubre SocialPro?',
      acceptedAnswer: { '@type': 'Answer', text: 'SocialPro opera activamente en México, Argentina, Colombia, Chile y Perú. Contamos con un manager dedicado al mercado latinoamericano con experiencia en gaming e iGaming local. Hemos ejecutado activaciones en los cinco mercados con tracking de resultados verificado.' },
    },
    {
      '@type': 'Question',
      name: '¿Cuántos creadores gaming tiene SocialPro en LATAM?',
      acceptedAnswer: { '@type': 'Answer', text: 'El roster de SocialPro incluye más de 100 creadores activos, con presencia significativa en LATAM especialmente en CS2, iGaming y gaming general. Los creadores gestionados por SocialPro suman más de 15 millones de views mensuales entre España y LatAm.' },
    },
    {
      '@type': 'Question',
      name: '¿Las campañas iGaming son legales en LATAM?',
      acceptedAnswer: { '@type': 'Answer', text: 'Cada país latinoamericano tiene su propio marco regulatorio para el iGaming. A diferencia de España, donde aplica el DGOJ, en LATAM la regulación varía por país y está en proceso de maduración. SocialPro asesora a los operadores en la compliance local antes de activar cualquier campaña.' },
    },
    {
      '@type': 'Question',
      name: '¿Por qué LATAM es un mercado estratégico para iGaming?',
      acceptedAnswer: { '@type': 'Answer', text: 'LATAM concentra más de 300 millones de hispanohablantes con alta penetración de smartphones y creciente acceso a pagos digitales. Los mercados de México, Argentina y Colombia están experimentando una regulación progresiva del iGaming que abre oportunidades únicas para operadores que entran ahora con partners locales.' },
    },
  ],
};

const STATS = [
  { stat: '300M+', label: 'Hispanohablantes en LATAM' },
  { stat: '5',     label: 'Mercados activos' },
  { stat: '13+',   label: 'Años en gaming' },
  { stat: '15M',   label: 'Views/mes gestionados' },
];

const MARKETS = [
  { country: 'México',    flag: '🇲🇽', desc: 'Mayor mercado gaming de LATAM. CS2, Valorant e iGaming en expansión regulatoria.' },
  { country: 'Argentina', flag: '🇦🇷', desc: 'Escena CS2 y esports muy activa. Alto engagement en iGaming y skins CS2.' },
  { country: 'Colombia',  flag: '🇨🇴', desc: 'Regulación iGaming en proceso de maduración. Gran audiencia joven en Twitch y YouTube.' },
  { country: 'Chile',     flag: '🇨🇱', desc: 'Mercado premium con alta penetración digital. Esports y gaming competitivo consolidados.' },
  { country: 'Perú',      flag: '🇵🇪', desc: 'Mercado emergente con comunidad gaming en rápido crecimiento.' },
];

const SERVICES = [
  { title: 'Influencers LATAM', desc: 'Acceso a streamers y creadores verificados en México, Argentina, Colombia y Chile con audiencias hispanohablantes.' },
  { title: 'Campañas iGaming', desc: 'Activaciones con tracking de FTDs (First Time Deposits) y compliance local adaptada a cada mercado.' },
  { title: 'Gestión de creadores', desc: 'Representación de creadores LATAM para deals con marcas internacionales en euros y dólares.' },
  { title: 'CS2 y esports', desc: 'Activaciones en torneos y campeonatos latinoamericanos. Sponsor integrado en competiciones.' },
  { title: 'Activación en 72h', desc: 'Desde el brief hasta creadores en directo en menos de 72 horas, también en mercados LATAM.' },
  { title: 'Reporting verificado', desc: 'Métricas de alcance, engagement, conversiones y ROI reportadas con datos auditables.' },
];

export default function AgenciaGamingLatamPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <StickyCtaMobile href="/contacto" label="Activar campaña LATAM →" ctaId="latam_sticky_cta" />

      <main className="bg-sp-black text-white">

        {/* Hero */}
        <section className="relative overflow-hidden pt-32 pb-20 px-4 sm:px-6 text-center">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(60% 40% at 50% 0%, rgba(245,99,42,0.12) 0%, transparent 60%)' }} />
          <div className="relative max-w-4xl mx-auto">
            <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-sp-orange mb-6">Gaming &amp; iGaming · México · Argentina · Colombia · Chile</p>
            <h1 className="font-display text-5xl sm:text-7xl md:text-8xl font-black uppercase leading-tight mb-6">
              AGENCIA <span style={g}>GAMING</span><br />PARA LATAM
            </h1>
            <p className="text-lg sm:text-xl text-sp-muted2 max-w-2xl mx-auto mb-10 leading-relaxed">
              Conectamos marcas globales con streamers y creadores gaming en México, Argentina, Colombia y Chile.
              13+ años de experiencia. FTD tracking. Compliance local.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <TrackedCtaLink href="/contacto" ctaId="latam_hero_primary" className="px-10 py-4 rounded-full font-bold text-white text-sm tracking-widest uppercase bg-sp-grad">
                Activar campaña LATAM →
              </TrackedCtaLink>
              <Link href="/casos" className="px-10 py-4 rounded-full font-bold text-white text-sm tracking-widest uppercase border border-white/15 hover:bg-white/10 transition-colors">
                Ver casos de éxito
              </Link>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 px-4 border-t border-white/[0.06]">
          <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {STATS.map(({ stat, label }) => (
              <div key={label}>
                <div className="font-display text-4xl sm:text-5xl font-black" style={g}>{stat}</div>
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-sp-muted2 mt-2">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Mercados */}
        <section className="py-20 px-4 sm:px-6 border-t border-white/[0.06]">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl font-black uppercase mb-4">Mercados activos en LATAM</h2>
            <p className="text-sp-muted2 mb-12 max-w-2xl">
              SocialPro tiene presencia operativa en los cinco principales mercados de gaming e iGaming en Latinoamérica. Nuestro manager LATAM coordina activaciones locales con conocimiento real del mercado.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {MARKETS.map(({ country, flag, desc }) => (
                <div key={country} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
                  <div className="text-3xl mb-3">{flag}</div>
                  <h3 className="font-display text-xl font-black uppercase mb-2">{country}</h3>
                  <p className="text-sm text-sp-muted2 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Servicios */}
        <section className="py-20 px-4 sm:px-6 border-t border-white/[0.06] bg-white/[0.02]">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl font-black uppercase mb-4">Qué hacemos en LATAM</h2>
            <p className="text-sp-muted2 mb-12 max-w-2xl">
              Desde la gestión de creadores hasta el tracking de conversiones. Activamos campañas gaming e iGaming
              en LATAM con los mismos estándares de performance que en España.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {SERVICES.map(({ title, desc }) => (
                <div key={title} className="rounded-2xl border border-white/[0.08] p-6">
                  <h3 className="font-bold text-white text-base mb-2">{title}</h3>
                  <p className="text-sm text-sp-muted2 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cases callout */}
        <section className="py-20 px-4 sm:px-6 border-t border-white/[0.06]">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl font-black uppercase mb-4">Resultados verificados</h2>
            <p className="text-sp-muted2 mb-8 max-w-2xl">
              SocialPro ha ejecutado activaciones en México, Argentina y Colombia con marcas como 1WIN, SkinsMonkey y RAZER.
              Cada campaña incluye reporting de alcance, engagement y conversiones con datos auditables.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 mb-12">
              {[
                { brand: '1WIN', result: '340+ FTDs en activación única · 100+ streamers · 8M+ alcance · México y Argentina' },
                { brand: 'SkinsMonkey', result: 'Campaña CS2 skins marketplace · Conversiones tracked · Colombia y Chile' },
                { brand: 'RAZER', result: 'Hardware activation · Creators gaming España y LatAm · Engagement verificado' },
              ].map(({ brand, result }) => (
                <div key={brand} className="flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
                  <div className="font-display text-xl font-black uppercase mb-2" style={g}>{brand}</div>
                  <p className="text-sm text-sp-muted2">{result}</p>
                </div>
              ))}
            </div>
            <Link href="/casos" className="inline-flex items-center gap-2 text-sm font-bold text-sp-orange uppercase tracking-widest hover:opacity-80 transition-opacity">
              Ver casos completos →
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 px-4 sm:px-6 border-t border-white/[0.06] bg-white/[0.02]">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl font-black uppercase mb-12">Preguntas frecuentes</h2>
            <div className="space-y-8">
              {faqJsonLd.mainEntity.map((q) => (
                <div key={q.name} className="border-b border-white/[0.06] pb-8">
                  <h3 className="font-bold text-white mb-3">{q.name}</h3>
                  <p className="text-sp-muted2 leading-relaxed">{q.acceptedAnswer.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="py-20 px-4 text-center border-t border-white/[0.06]">
          <div className="max-w-2xl mx-auto">
            <h2 className="font-display text-4xl sm:text-5xl font-black uppercase mb-6">
              ¿Listo para<br /><span style={g}>activar en LATAM?</span>
            </h2>
            <p className="text-sp-muted2 mb-10">
              Cuéntanos tu proyecto. Respondemos en menos de 24h con una propuesta adaptada al mercado que necesitas.
            </p>
            <TrackedCtaLink href="/contacto" ctaId="latam_bottom_cta" className="px-12 py-4 rounded-full font-bold text-white text-sm tracking-widest uppercase bg-sp-grad">
              Activar campaña LATAM →
            </TrackedCtaLink>
          </div>
        </section>
      </main>
    </>
  );
}
