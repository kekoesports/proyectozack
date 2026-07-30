import type { Metadata } from 'next';
import Link from 'next/link';

import { safeJsonLd } from '@/lib/safeJsonLd';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';
import { TrackedCtaLink } from '@/components/ui/TrackedCtaLink';
import { buildBreadcrumbJsonLd } from '@/lib/utils/breadcrumbs';
import { StickyCtaMobile } from '@/components/ui/StickyCtaMobile';

export const metadata: Metadata = {
  title: 'Marketing de Skins CS2 & Case Opening — Agencia Especializada',
  description:
    'Agencia de marketing para plataformas de skins CS2 y case opening. Streamers verificados en España y LatAm, conversiones rastreadas desde el panel del operador y activación en menos de 72 horas.',
  alternates: { canonical: '/marketing-skins-cs2' },
  openGraph: {
    title: 'Marketing de Skins CS2 & Case Opening | SocialPro',
    description:
      'Campañas con streamers CS2 hispanohablantes para plataformas de skins, marketplaces y case opening. Conversiones auditables, activación <72h.',
    url: absoluteUrl('/marketing-skins-cs2'),
    siteName: 'SocialPro',
    locale: 'es_ES',
    type: 'website',
    images: [{
      url: absoluteUrl('/og-socialpro.png'),
      width: 1200,
      height: 630,
      alt: 'Marketing de skins CS2 y case opening — SocialPro',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marketing de Skins CS2 & Case Opening | SocialPro',
    description:
      'Streamers CS2 verificados para skins, marketplaces y case opening. Conversiones desde el panel del operador.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

const g = {
  background: 'linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%)',
  WebkitBackgroundClip: 'text' as const,
  WebkitTextFillColor: 'transparent' as const,
  backgroundClip: 'text' as const,
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Marketing de Skins CS2 y Case Opening',
  serviceType: 'CS2 Skins & Case Opening Influencer Marketing',
  inLanguage: 'es',
  provider: { '@type': 'Organization', '@id': absoluteUrl('/#organization'), name: 'SocialPro', url: SITE_URL },
  areaServed: ['España', 'México', 'Argentina', 'Colombia', 'Chile', 'Perú'],
  description:
    'Campañas con streamers CS2 hispanohablantes para plataformas de skins, marketplaces y case opening. Conversiones rastreadas desde el panel del operador y activación en menos de 72 horas.',
};

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: 'Servicios', url: absoluteUrl('/servicios') },
  { name: 'Marketing de Skins CS2', url: absoluteUrl('/marketing-skins-cs2') },
]);

const FAQS = [
  {
    q: '¿Qué tipo de plataformas de skins CS2 promociona SocialPro?',
    a: 'Trabajamos con tres tipos: marketplaces P2P (compra-venta directa entre usuarios, tipo SkinsMonkey), case opening sites (apertura de cajas virtuales con resultados provably fair, tipo KeyDrop o CSDROP) y plataformas de trade-up y upgrade (mejorar o intercambiar skins por otras de mayor valor). Cada tipo tiene su propio ciclo de conversión y sus creadores idóneos — un streamer que rinde muy bien en marketplaces no necesariamente convierte igual en case opening. La preselección de talento la ajustamos al producto.',
  },
  {
    q: '¿Cómo se rastrean las conversiones en una campaña de skins?',
    a: 'Cada streamer recibe un código de referido único que se integra en la URL o en el enlace de afiliado del operador. Las transacciones (depósitos, aperturas, trades) quedan registradas en el panel del propio operador y se atribuyen automáticamente al creador que las generó. En la campaña SkinsMonkey de 2025 el modelo permitió atribuir 200.000€ en volumen de trading directamente a los streamers de SocialPro con datos validados desde la plataforma.',
  },
  {
    q: '¿Qué plataformas de skins ya han trabajado con SocialPro?',
    a: 'SkinsMonkey (marketplace CS2, campaña con volumen de trading auditado desde su plataforma), KeyDrop (case opening, activaciones continuas con creadores del roster), EmpireDrop y CSDROP entre otras. Cada operador tiene su propia página de marca en socialpro.es donde puedes ver los detalles públicos de la relación. La agencia no promociona plataformas sin operar legalmente en sus mercados objetivo.',
  },
  {
    q: '¿Los streamers de CS2 hispanos convierten realmente para skins?',
    a: 'La comunidad hispanohablante de CS2 tiene una familiaridad alta con las mecánicas de skins: compra-venta, trade-up, case opening y provably fair son términos que los espectadores manejan de forma nativa. Eso reduce fricción de conversión frente a audiencias gaming generalistas. La escena hispana además consume contenido de skins de forma sostenida (no solo picos por torneo), lo que permite campañas continuas y no solo activaciones puntuales.',
  },
  {
    q: '¿Hay que cumplir normativa DGOJ para promocionar skins en España?',
    a: 'Depende del producto. Según el marco regulatorio vigente en España a 2026, los marketplaces P2P y las plataformas de trade-up no se consideran juego regulado — no requieren licencia DGOJ. El tratamiento varía por país y por tipo de plataforma, así que conviene validar el marco aplicable con el operador antes de cada activación. Las plataformas de case opening operan bajo regímenes distintos según su jurisdicción; SocialPro solo colabora con operadores que cumplen la normativa aplicable en cada mercado objetivo y siempre añade disclaimers de edad (+18) en todo el contenido patrocinado. Las plataformas de casino con skins caen bajo DGOJ y usan nuestro flujo iGaming estándar.',
  },
  {
    q: '¿En cuánto tiempo se puede activar una campaña de skins CS2?',
    a: 'Desde el brief firmado hasta el primer streamer emitiendo contenido patrocinado, el estándar operativo es de 72 horas. Requiere que el operador tenga los assets técnicos listos (link de afiliado, código de referido, materiales gráficos) y que el brief incluya el mercado objetivo y objetivos de conversión. Campañas más complejas con activación multipaís simultánea suelen estabilizarse en la primera semana.',
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

const STATS = [
  { stat: '200K€', label: 'Volumen de trading rastreado (SkinsMonkey)' },
  { stat: '<72h', label: 'De briefing a campaña activa' },
  { stat: '6 países', label: 'España + 5 mercados LatAm' },
];

const PORQUES = [
  {
    title: 'Conocimiento nativo del ecosistema skins',
    desc: 'Marketplace, case opening, trade-up y provably fair no son jerga que traducimos — son mecánicas que la audiencia hispana consume de forma cotidiana y que nuestro roster de streamers comunica sin fricción.',
  },
  {
    title: 'Conversiones auditadas por el operador',
    desc: 'Cada campaña usa códigos de referido únicos por creador. Las transacciones se validan desde el panel del propio operador, no desde analytics de terceros. Los datos son atribuibles y trazables.',
  },
  {
    title: 'Multipaís con un único brief',
    desc: 'España, México, Argentina, Colombia, Chile y Perú en la misma campaña. Coordinamos creadores locales en 6 mercados hispanohablantes con un solo brief central.',
  },
];

const COMO_FUNCIONA = [
  { step: '01', title: 'Brief del operador', desc: 'Producto, objetivos de conversión, mercados objetivo, presupuesto y assets técnicos (link afiliado, código de referido, materiales gráficos).' },
  { step: '02', title: 'Preselección de talento', desc: 'Elegimos entre nuestro roster los creadores que mejor encajan con el tipo de plataforma (marketplace vs case opening vs trade-up) y con los mercados objetivo.' },
  { step: '03', title: 'Activación en 72h', desc: 'Streamers emitiendo contenido patrocinado con disclaimer +18, código único y CTA claro. Cobertura sostenida durante la ventana de campaña acordada.' },
  { step: '04', title: 'Reporting con datos del operador', desc: 'Informe final con volumen de trading, aperturas, depósitos o KPI acordado — todo desde el panel del operador, no estimaciones.' },
];

export default function MarketingSkinsCs2Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />

      {/* Hero */}
      <section className="bg-sp-black pt-24 pb-12 md:pt-32 md:pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-4">
            Marketing de skins CS2 · España y LatAm
          </p>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-tight mb-6">
            Agencia de <span style={g}>skins CS2 y case opening</span> para el mercado hispano
          </h1>
          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto mb-6">
            SocialPro es la agencia especializada en marketing de skins CS2 y case opening sites
            en el mercado hispanohablante. Campañas con streamers CS2 verificados en España y
            LatAm para plataformas como SkinsMonkey, KeyDrop, EmpireDrop y CSDROP, con
            conversiones rastreadas desde el panel del propio operador y activación en menos de
            72 horas.
          </p>
          <div className="flex flex-wrap justify-center gap-8 mb-10">
            {STATS.map(({ stat, label }) => (
              <div key={label} className="text-center">
                <div className="font-display text-3xl font-black" style={g}>{stat}</div>
                <div className="text-xs text-white/40 mt-1 max-w-[150px]">{label}</div>
              </div>
            ))}
          </div>
          <TrackedCtaLink
            href="/contacto?type=brand"
            ctaId="landing_skins_cs2_hero"
            className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
          >
            Activar streamers CS2 para tu plataforma
          </TrackedCtaLink>
        </div>
      </section>

      {/* Roster relevante */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Por qué SocialPro</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-6">
            ¿Por qué una agencia especializada en skins CS2 hispanohablantes?
          </h2>
          <p className="text-base text-sp-muted leading-relaxed mb-10 max-w-3xl">
            El marketing de skins no es marketing gaming general. La audiencia CS2 hispanohablante
            maneja de forma nativa la mecánica del marketplace, el trade-up, el provably fair y el
            case opening — vocabulario y comportamiento de compra que un creador de otra vertical
            no puede replicar. SocialPro lleva años activando campañas para operadores del sector
            en España y LatAm: sabemos qué streamer convierte mejor para un marketplace P2P, cuál
            para case opening, y cuál genera trade-up sostenido. Cada activación se ajusta al tipo
            de producto y al mercado objetivo antes del primer brief público.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {PORQUES.map((p) => (
              <div key={p.title} className="rounded-2xl border border-sp-border bg-sp-off p-6">
                <h3 className="font-display text-base font-black uppercase text-sp-dark mb-3">
                  {p.title}
                </h3>
                <p className="text-sm text-sp-muted leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="bg-sp-off py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Cómo funciona</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-10">
            De briefing a campaña activa en 4 pasos
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {COMO_FUNCIONA.map((s) => (
              <div key={s.step} className="bg-white rounded-2xl border border-sp-border p-6">
                <div className="font-display text-2xl font-black text-sp-orange mb-2">{s.step}</div>
                <h3 className="font-display text-base font-black uppercase text-sp-dark mb-2">
                  {s.title}
                </h3>
                <p className="text-sm text-sp-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resultados reales */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Resultados verificados</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-6">
            Casos reales de marketing de skins CS2
          </h2>
          <p className="text-base text-sp-muted leading-relaxed mb-8 max-w-3xl">
            La cifra pública principal viene de la campaña SkinsMonkey: 200.000€ en volumen de
            trading atribuidos directamente a los creadores CS2 de SocialPro, con datos
            validados desde la plataforma del marketplace. El resto de partners —{' '}
            <Link href="/marcas/keydrop" className="font-semibold text-sp-orange hover:underline">KeyDrop</Link>,{' '}
            EmpireDrop y CSDROP entre otros — operan bajo NDAs comerciales que no permiten
            publicar cifras específicas por campaña. Todos los datos que ves en esta página
            provienen del panel del propio operador.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-sp-off rounded-2xl border border-sp-border p-8">
              <div className="font-display text-4xl font-black text-sp-dark mb-1">200K€</div>
              <div className="text-sp-orange text-xs font-bold uppercase tracking-wider mb-3">
                <Link href="/marcas/skinsmonkey" className="hover:underline">SkinsMonkey · marketplace CS2</Link>
              </div>
              <p className="text-sm text-sp-muted leading-relaxed">
                Campaña de 6 semanas con código de referido único por streamer. 200.000€ en
                transacciones atribuidas directamente a creadores CS2 de SocialPro. Volumen validado
                desde la plataforma del propio marketplace, no desde analytics de terceros. ROI
                positivo desde la primera semana.{' '}
                <Link href="/casos/skinsmonkey" className="font-semibold text-sp-orange hover:underline">
                  Ver caso completo →
                </Link>
              </p>
            </div>
            <div className="bg-sp-off rounded-2xl border border-sp-border p-8">
              <div className="font-display text-4xl font-black text-sp-dark mb-1">Continuo</div>
              <div className="text-sp-orange text-xs font-bold uppercase tracking-wider mb-3">
                <Link href="/marcas/keydrop" className="hover:underline">KeyDrop · case opening</Link>
              </div>
              <p className="text-sm text-sp-muted leading-relaxed">
                Activaciones sostenidas con creadores de SocialPro y colaboradores del
                ecosistema: Naow desde el roster de la agencia, el cofundador y streamer
                Zacketizor (Alfonso &ldquo;Zack&rdquo; Arias, co-fundador de SocialPro que
                sigue activo como creador de contenido en el ecosistema) y colaboraciones
                puntuales como la de Imantado. Códigos de referido y sistema de tracking
                multi-creador integrado en la plataforma. EmpireDrop y CSDROP siguen un
                modelo operativo equivalente; cifras agregadas bajo NDA de partners.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="bg-sp-off py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Compliance</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-6">
            Marco regulatorio de las campañas de skins
          </h2>
          <div className="space-y-4 text-base text-sp-muted leading-relaxed">
            <p>
              El régimen legal aplicable depende del tipo de plataforma. Según el marco
              regulatorio vigente en España a 2026, los marketplaces P2P y las herramientas
              de trade-up no se consideran juego regulado — no requieren licencia DGOJ ni
              entran en los horarios publicitarios del Real Decreto 958/2020. El tratamiento
              varía por país y por tipo de plataforma; conviene validar el marco aplicable
              con cada operador antes de una activación.
            </p>
            <p>
              Las plataformas de case opening operan bajo regímenes distintos según su
              jurisdicción de licencia. SocialPro solo colabora con operadores que cumplen la
              normativa aplicable en cada mercado objetivo, y añade{' '}
              <strong className="text-sp-dark">disclaimer +18 en todo el contenido patrocinado</strong>{' '}
              con recordatorio de{' '}
              <Link href="/sorteos/participacion-responsable" className="font-semibold text-sp-orange hover:underline">
                participación responsable
              </Link>.
            </p>
            <p>
              Cuando una plataforma incluye mecánicas de casino con skins (ruleta, blackjack,
              slots) el flujo pasa por nuestro protocolo iGaming estándar con{' '}
              <Link href="/servicios/igaming" className="font-semibold text-sp-orange hover:underline">
                cumplimiento DGOJ integrado
              </Link>{' '}
              y ventanas publicitarias 1:00-5:00 en el mercado español.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ (visible) */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">FAQ</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-8">
            Preguntas frecuentes sobre marketing de skins CS2
          </h2>
          <div className="rounded-2xl border border-sp-border bg-sp-off p-6 md:p-8">
            {FAQS.map((f, i) => (
              <details
                key={f.q}
                className="group border-b border-sp-border last:border-b-0"
                {...(i === 0 ? { open: true } : {})}
              >
                <summary className="flex w-full cursor-pointer list-none items-center justify-between py-5 text-left [&::-webkit-details-marker]:hidden">
                  <span className="pr-4 font-semibold text-sp-dark transition-colors group-hover:text-sp-orange group-open:text-sp-orange">
                    {f.q}
                  </span>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-sp-border text-sm text-sp-muted transition-colors group-open:border-sp-orange group-open:text-sp-orange">
                    <span className="block transition-transform duration-200 group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="pb-5 text-sm leading-relaxed text-sp-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Cross-linking editorial */}
      <section className="bg-sp-off border-t border-sp-border py-10">
        <div className="max-w-3xl mx-auto px-6 text-sm text-sp-muted leading-relaxed space-y-3">
          <p>
            Muchos de estos creadores CS2 también participan en{' '}
            <Link href="/influencers-cs2" className="font-semibold text-sp-orange hover:underline">
              campañas generales de influencers CS2
            </Link>{' '}
            y en el proyecto de{' '}
            <Link href="/apuesta-segura-cs2" className="font-semibold text-sp-orange hover:underline">
              apuestas seguras en Counter-Strike
            </Link>
            . Si tu plataforma combina skins con casino, revisa nuestros{' '}
            <Link href="/servicios/igaming" className="font-semibold text-sp-orange hover:underline">
              servicios iGaming con compliance DGOJ
            </Link>{' '}
            y nuestra{' '}
            <Link href="/agencia-streamers-kick" className="font-semibold text-sp-orange hover:underline">
              agencia de streamers de Kick
            </Link>
            {' '}(plataforma que sí admite streaming de casino en directo).
          </p>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-sp-black py-16 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-3xl font-black uppercase text-white mb-4">
            ¿Listo para activar tu plataforma de{' '}
            <span style={g}>skins CS2 con streamers hispanos?</span>
          </h2>
          <p className="text-white/50 mb-8">
            Cuéntanos el tipo de producto (marketplace, case opening, trade-up), el mercado
            objetivo y tu objetivo de conversión. Diseñamos la selección de streamers y la
            propuesta de activación en 48 horas.
          </p>
          <TrackedCtaLink
            href="/contacto?type=brand"
            ctaId="landing_skins_cs2_footer"
            className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
          >
            Solicitar propuesta
          </TrackedCtaLink>
        </div>
      </section>

      <StickyCtaMobile
        href="/contacto?type=brand"
        label="Solicitar propuesta"
        ctaId="sticky_skins_cs2_mobile"
      />
    </>
  );
}
