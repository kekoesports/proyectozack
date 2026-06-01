import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';
import Link from 'next/link';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';
import { buildBreadcrumbJsonLd } from '@/lib/utils/breadcrumbs';

export const metadata: Metadata = {
  title: 'Influencers Betting y Apuestas Online — España y LatAm',
  description:
    'Influencers betting y apuestas online verificados en España y LatAm. Compliance DGOJ integrado, FTD tracking y ROI demostrable para operadores de apuestas deportivas y casino.',
  alternates: {
    // Consolidado en el ganador del cluster. /servicios/igaming es el ES canónico
    // establecido; /betting-influencers es el EN x-default. Esta página es satélite.
    canonical: '/servicios/igaming',
  },
  openGraph: {
    title: 'Influencers Betting y Apuestas Online | SocialPro',
    description: 'Streamers de apuestas y casino verificados. Compliance DGOJ, FTD tracking y ROI demostrable en España y LatAm.',
    url: absoluteUrl('/influencers-betting'),
    type: 'website',
    images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Influencers Betting y Apuestas | SocialPro',
    description: 'Streamers de apuestas verificados. Compliance DGOJ y FTD tracking en España y LatAm.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

const g = { background: 'linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%)', WebkitBackgroundClip: 'text' as const, WebkitTextFillColor: 'transparent' as const, backgroundClip: 'text' as const };

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Influencers Betting y Apuestas Online',
  serviceType: 'iGaming Influencer Marketing',
  inLanguage: 'es',
  provider: { '@type': 'Organization', name: 'SocialPro', url: SITE_URL },
  areaServed: ['España', 'México', 'Argentina', 'Colombia', 'Chile', 'Turquía'],
  description: 'Campañas con influencers de apuestas deportivas y casino online. Compliance DGOJ, FTD tracking y reporting verificado en España, LatAm y Turquía.',
};

const breadcrumbJsonLd = buildBreadcrumbJsonLd([{ name: 'Servicios', url: absoluteUrl('/servicios') }, { name: 'Influencers Betting', url: absoluteUrl('/influencers-betting') }]);

const STATS = [
  { stat: '+340', label: 'FTDs en una sola activación' },
  { stat: '200K€', label: 'Conversiones SkinsMonkey' },
  { stat: '4+', label: 'Años en campañas de apuestas' },
  { stat: '<72h', label: 'De briefing a campaña activa' },
];

const COMPLIANCE_STEPS = [
  { num: '01', t: 'Vetting del creador', d: 'Verificamos que el influencer tiene historial limpio, audiencia mayoritariamente mayor de 18 años y experiencia en contenido de apuestas antes de cualquier activación.' },
  { num: '02', t: 'Briefing legal', d: 'Cada campaña incluye un briefing de compliance adaptado a la regulación DGOJ: disclaimers obligatorios, restricciones de mensaje y proceso de verificación.' },
  { num: '03', t: 'Revisión pre-publicación', d: 'Todo el contenido se revisa antes de publicarse. Nada sale sin aprobación del equipo legal y de la marca.' },
  { num: '04', t: 'FTD tracking verificado', d: 'Cada conversión se atribuye al influencer que la generó. Reportes con datos del operador, no capturas de pantalla.' },
];

export default function InfluencersBettingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />

      <section className="bg-sp-black pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-4">Influencers Betting · Apuestas y Casino Online</p>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-tight mb-6">
            Influencers de Apuestas<br /><span style={g}>con Compliance Real</span>
          </h1>
          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto mb-10">
            Streamers de apuestas deportivas y casino online verificados en España, LatAm y Turquía.
            Compliance DGOJ integrado. FTD tracking desde el día uno.
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
            Activar campaña de apuestas
          </Link>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Proceso con compliance</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-10">Así protegemos a operador e influencer</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {COMPLIANCE_STEPS.map((s) => (
              <div key={s.num} className="rounded-2xl border border-sp-border bg-sp-off p-6">
                <div className="font-display text-2xl font-black mb-2" style={g}>{s.num}</div>
                <h3 className="font-display text-base font-black uppercase text-sp-dark mb-2">{s.t}</h3>
                <p className="text-sm text-sp-muted leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-sp-muted mt-6">
            Ver detalles completos de compliance en <Link href="/servicios/igaming" className="text-sp-orange hover:underline">nuestra página iGaming</Link>.
          </p>
        </div>
      </section>

      <section className="bg-sp-black py-16 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-3xl font-black uppercase text-white mb-4">Activa tus <span style={g}>influencers de apuestas</span></h2>
          <p className="text-white/50 mb-8">Cuéntanos tu operador, mercado y objetivo de conversión. Diseñamos una propuesta con compliance incluido en 48 horas.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contacto" className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity">Solicitar propuesta</Link>
            <Link href="/betting-influencers" className="inline-block border border-white/20 text-white/60 font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:border-white/40 hover:text-white transition-colors">English version →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
