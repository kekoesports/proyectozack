import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  title: 'Agencia de Influencers Valorant — España y LatAm',
  description:
    'Agencia de influencers Valorant especializada en el mercado hispano. Streamers verificados de Valorant en España y LatAm con audiencias reales y campañas orientadas a resultados.',
  alternates: {
    canonical: '/agencia-influencers-valorant',
    languages: {
      es: absoluteUrl('/agencia-influencers-valorant'),
      en: absoluteUrl('/valorant-influencers-agency'),
          'x-default': absoluteUrl('/valorant-influencers-agency'),
    },
  },
  openGraph: {
    title: 'Agencia de Influencers Valorant España y LatAm | SocialPro',
    description: 'Streamers Valorant verificados en España y LatAm. Campañas orientadas a resultados con audiencias reales y métricas verificadas.',
    url: absoluteUrl('/agencia-influencers-valorant'),
    type: 'website',
    images: [{ url: absoluteUrl('/og-default.jpg'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agencia Influencers Valorant | SocialPro',
    description: 'Streamers Valorant en España y LatAm. Audiencias verificadas, resultados medibles.',
    images: [absoluteUrl('/og-default.jpg')],
  },
};

const g = { background: 'linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%)', WebkitBackgroundClip: 'text' as const, WebkitTextFillColor: 'transparent' as const, backgroundClip: 'text' as const };

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Agencia de Influencers Valorant España y LatAm',
  serviceType: 'Valorant Influencer Marketing',
  inLanguage: 'es',
  provider: { '@type': 'Organization', name: 'SocialPro', url: SITE_URL },
  areaServed: ['España', 'México', 'Argentina', 'Colombia', 'Chile'],
  description: 'Campañas con influencers Valorant verificados en España y LatAm. Audiencias reales, contenido brand-safe y métricas de rendimiento verificadas.',
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: '¿Por qué Valorant es un buen canal para campañas de marca?', acceptedAnswer: { '@type': 'Answer', text: 'Valorant atrae a una audiencia más joven y diversa que CS2, con mayor presencia femenina y un perfil más mainstream. El ecosistema de Riot Games impone estándares de contenido que hacen a los streamers de Valorant inherentemente más brand-safe. Es el FPS de mayor crecimiento en LatAm.' } },
    { '@type': 'Question', name: '¿Qué tipo de marcas encajan con influencers Valorant?', acceptedAnswer: { '@type': 'Answer', text: 'Valorant es ideal para marcas de consumo masivo orientadas a jóvenes: energéticas, ropa, tecnología, apps, periféricos gaming y marcas de lifestyle digital. La audiencia es digitalmente nativa y altamente receptiva a marcas alineadas con la cultura gamer.' } },
    { '@type': 'Question', name: '¿La escena de Valorant en español es grande?', acceptedAnswer: { '@type': 'Answer', text: 'Sí. Valorant es el FPS dominante en la mayoría de los mercados latinoamericanos y tiene una comunidad muy activa en España. La escena competitiva en español —torneos, pro players, creators— está en su momento de mayor crecimiento.' } },
  ],
};

const STATS = [
  { stat: '15M+', label: 'Views mensuales en el roster' },
  { stat: '5', label: 'Mercados en España y LatAm' },
  { stat: '<72h', label: 'De briefing a campaña activa' },
  { stat: '13+', label: 'Años en marketing gaming' },
];

const OPORTUNIDADES = [
  { title: 'El FPS de mayor crecimiento en LatAm', desc: 'Valorant es hoy el juego competitivo dominante en la mayoría de mercados de habla hispana. La audiencia está en plena fase de crecimiento — el momento de entrar es ahora, antes de que la saturación de marcas llegue.' },
  { title: 'Audiencia más diversa y mainstream', desc: 'Comparado con CS2, Valorant atrae un perfil más joven, más femenino y más abierto a marcas de consumo general. Marcas que buscan alcanzar a la Generación Z gamer encuentran en Valorant su nicho natural.' },
  { title: 'Contenido brand-safe por diseño', desc: 'Riot Games regula activamente el contenido de su ecosistema. Los streamers de Valorant operan en un entorno más estructurado y supervisado, reduciendo el riesgo reputacional asociado a contenido gaming no regulado.' },
];

export default function AgenciaInfluencersValorantPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <section className="bg-sp-black pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-4">Agencia de Influencers Valorant</p>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-tight mb-6">
            Agencia de Influencers Valorant<br /><span style={g}>en España y LatAm</span>
          </h1>
          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto mb-10">
            Streamers de Valorant verificados con audiencias reales en el mercado hispano.
            Brand-safe, orientado a resultados y activación en menos de 72 horas.
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
            Activar campaña Valorant
          </Link>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">La oportunidad</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-10">Por qué Valorant y por qué ahora</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {OPORTUNIDADES.map((o) => (
              <div key={o.title} className="rounded-2xl border border-sp-border bg-sp-off p-6">
                <h3 className="font-display text-base font-black uppercase text-sp-dark mb-3">{o.title}</h3>
                <p className="text-sm text-sp-muted leading-relaxed">{o.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-sp-off py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Proceso</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-8">De brief a campaña Valorant en 3 pasos</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { num: '01', t: 'Selección de influencers', d: 'Elegimos streamers Valorant cuya audiencia, estilo y valores encajan con tu marca. Verificación de audiencia real antes de cualquier activación.' },
              { num: '02', t: 'Ejecución coordinada', d: 'Gestión completa: briefings, revisión de contenido, calendario y publicación. Tú te concentras en los resultados.' },
              { num: '03', t: 'Reporting verificado', d: 'Métricas reales: alcance, engagement y conversiones atribuidas. Reportes en 48h tras el fin de campaña.' },
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
          <h2 className="font-display text-3xl font-black uppercase text-white mb-4">Lanza tu campaña <span style={g}>Valorant</span></h2>
          <p className="text-white/50 mb-8">Cuéntanos tu marca, audiencia objetivo y KPIs. Diseñamos una propuesta personalizada de influencers Valorant en 48 horas.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contacto" className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity">Solicitar propuesta</Link>
            <Link href="/valorant-influencers-agency" className="inline-block border border-white/20 text-white/60 font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:border-white/40 hover:text-white transition-colors">English version →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
