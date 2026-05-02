import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  title: 'Influencers CS2 España y LatAm — Marketing con Streamers CS2',
  description:
    'Influencers CS2 verificados para campañas de marketing en España y LatAm. Streamers de Counter-Strike 2 con audiencias reales, FTD tracking y activación en menos de 72h.',
  alternates: {
    canonical: '/influencers-cs2',
    languages: {
      es: absoluteUrl('/influencers-cs2'),
      en: absoluteUrl('/cs2-influencer-marketing'),
    },
  },
  openGraph: {
    title: 'Influencers CS2 España y LatAm | SocialPro',
    description: 'Streamers CS2 verificados en España y LatAm. FTD tracking, audiencias reales y activación en menos de 72 horas.',
    url: absoluteUrl('/influencers-cs2'),
    type: 'website',
    images: [{ url: absoluteUrl('/og-default.jpg'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Influencers CS2 España y LatAm | SocialPro',
    description: 'Streamers CS2 verificados. FTD tracking y activación en <72h en España y LatAm.',
    images: [absoluteUrl('/og-default.jpg')],
  },
};

const g = { background: 'linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%)', WebkitBackgroundClip: 'text' as const, WebkitTextFillColor: 'transparent' as const, backgroundClip: 'text' as const };

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Influencers CS2 España y LatAm',
  serviceType: 'CS2 Influencer Marketing',
  inLanguage: 'es',
  provider: { '@type': 'Organization', name: 'SocialPro', url: SITE_URL },
  areaServed: ['España', 'México', 'Argentina', 'Colombia', 'Chile'],
  description: 'Campañas con influencers CS2 verificados en España y LatAm. FTD tracking, audiencias reales y activación en menos de 72 horas.',
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: '¿Por qué la audiencia de CS2 convierte mejor que otras audiencias gaming?', acceptedAnswer: { '@type': 'Answer', text: 'Los jugadores de CS2 viven en una economía de transacciones: compran skins, abren cajas, apuestan en skins y participan en plataformas iGaming desde edades tempranas. Tienen alta familiaridad con pagos digitales y propensión al gasto muy superior a audiencias gaming generalistas.' } },
    { '@type': 'Question', name: '¿Qué marcas encajan mejor con influencers CS2 en España?', acceptedAnswer: { '@type': 'Answer', text: 'Las campañas con influencers CS2 funcionan especialmente bien para marcas de iGaming (casas de apuestas, casinos online, skins), periféricos gaming, hardware, energéticas y cualquier marca orientada al segmento masculino 18-35 años.' } },
    { '@type': 'Question', name: '¿Cómo medís las conversiones en campañas con streamers CS2?', acceptedAnswer: { '@type': 'Answer', text: 'Cada influencer CS2 recibe un código único de seguimiento. Rastreamos clics, registros y FTDs atribuidos a cada creador. SocialPro entrega reportes con datos verificados directamente del operador.' } },
    { '@type': 'Question', name: '¿Cuánto tarda en activarse una campaña con influencers CS2?', acceptedAnswer: { '@type': 'Answer', text: 'De briefing a campaña activa en menos de 72 horas. Esto incluye selección de creadores, firma de contrato, briefing de compliance y coordinación de publicación.' } },
  ],
};

const STATS = [
  { stat: '8M+', label: 'Reach en campaña 1WIN CS2' },
  { stat: '+340', label: 'FTDs en una sola activación' },
  { stat: '100+', label: 'Streamers en una campaña' },
  { stat: '<72h', label: 'De briefing a campaña activa' },
];

const PORQUES = [
  { title: 'Conocemos la escena CS2 en español', desc: 'No somos una agencia generalista que gestiona CS2. Conocemos los creadores, la cultura y la audiencia hispana del juego desde hace años. Eso se traduce en campañas que encajan de verdad.' },
  { title: 'Audiencia de alta conversión local', desc: 'La comunidad CS2 hispanohablante tiene alta familiaridad con pagos digitales y plataformas de skins. La tasa de conversión para iGaming, periféricos y hardware supera con creces las audiencias gaming generalistas.' },
  { title: 'Activaciones multipaís en simultáneo', desc: 'Cubrimos España, México, Argentina, Colombia y Chile con un único brief. Coordinar campañas en 5 mercados a la vez es nuestro estándar operativo, no una excepción.' },
];

export default function InfluencersCs2Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <section className="bg-sp-black pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-4">Influencers CS2 · España y LatAm</p>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-tight mb-6">
            Streamers de CS2<br /><span style={g}>que Convierten</span>
          </h1>
          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto mb-10">
            Influencers CS2 verificados en España y LatAm. La audiencia con mayor propensión al gasto en gaming,
            con FTD tracking y activación en menos de 72 horas.
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
            Lanza tu campaña CS2
          </Link>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Por qué SocialPro</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-10">La agencia que conoce la escena CS2 hispana</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {PORQUES.map((p) => (
              <div key={p.title} className="rounded-2xl border border-sp-border bg-sp-off p-6">
                <h3 className="font-display text-base font-black uppercase text-sp-dark mb-3">{p.title}</h3>
                <p className="text-sm text-sp-muted leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-sp-off py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Resultados verificados</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-8">Campañas CS2 con datos reales</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-sp-border p-8">
              <div className="font-display text-4xl font-black text-sp-dark mb-1">8M+</div>
              <div className="text-sp-orange text-xs font-bold uppercase tracking-wider mb-3">1WIN · Torneo CS2</div>
              <p className="text-sm text-sp-muted leading-relaxed">Campaña multiterritorio con más de 100 streamers activados en simultáneo en España, México, Argentina y Colombia. Integrada en torneo CS2 con picos de audiencia superiores a 500K espectadores en directo.</p>
            </div>
            <div className="bg-white rounded-2xl border border-sp-border p-8">
              <div className="font-display text-4xl font-black text-sp-dark mb-1">200K€</div>
              <div className="text-sp-orange text-xs font-bold uppercase tracking-wider mb-3">SkinsMonkey · Conversiones rastreadas</div>
              <p className="text-sm text-sp-muted leading-relaxed">Campaña de 6 semanas con código de referido único por streamer. 200.000€ en transacciones atribuidas directamente a creadores CS2 de SocialPro. ROI positivo desde la primera semana.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-sp-black py-16 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-3xl font-black uppercase text-white mb-4">Activa tu campaña <span style={g}>CS2 en 72h</span></h2>
          <p className="text-white/50 mb-8">Cuéntanos tu producto, objetivo de conversión y mercado. Diseñamos una propuesta con influencers CS2 seleccionados en 48 horas.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contacto" className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity">Solicitar propuesta</Link>
            <Link href="/cs2-influencer-marketing" className="inline-block border border-white/20 text-white/60 font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:border-white/40 hover:text-white transition-colors">English version →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
