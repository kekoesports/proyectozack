import type { Metadata } from 'next';
import Link from 'next/link';

import { safeJsonLd } from '@/lib/safeJsonLd';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';
import { TrackedCtaLink } from '@/components/ui/TrackedCtaLink';
import { buildBreadcrumbJsonLd } from '@/lib/utils/breadcrumbs';
import { StickyCtaMobile } from '@/components/ui/StickyCtaMobile';
import { GlossaryText } from '@/components/ui/GlossaryText';

// TODO Pablo: validar claims editoriales de esta landing antes de promocionarla.
// A diferencia de casino y sportsbook, no hay caso público de poker con cifras
// verificables — esta página se enfoca en capacidad + roster + compliance sin
// afirmar volúmenes específicos. Revisa que ningún párrafo insinúe métricas
// que no tengamos publicadas.

export const metadata: Metadata = {
  title: 'Influencers Poker — Streamers de Póker Online España y LatAm',
  description:
    'Agencia especializada en influencers y streamers de poker online para España y LatAm. Selección de creadores por perfil (torneos, cash game, coaching), compliance DGOJ integrado y activación en menos de 72 horas.',
  alternates: { canonical: '/influencers-poker' },
  openGraph: {
    title: 'Influencers Poker | SocialPro',
    description:
      'Streamers de poker online en España y LatAm. Compliance DGOJ integrado, roster por perfil (torneos, cash, coaching).',
    url: absoluteUrl('/influencers-poker'),
    siteName: 'SocialPro',
    locale: 'es_ES',
    type: 'website',
    images: [{
      url: absoluteUrl('/og-socialpro.png'),
      width: 1200,
      height: 630,
      alt: 'Influencers poker — SocialPro',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Influencers Poker | SocialPro',
    description:
      'Streamers de poker en España y LatAm. Compliance DGOJ y roster por perfil.',
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
  name: 'Influencers Poker',
  serviceType: 'Poker Influencer Marketing',
  inLanguage: 'es',
  provider: { '@type': 'Organization', '@id': absoluteUrl('/#organization'), name: 'SocialPro', url: SITE_URL },
  areaServed: ['España', 'México', 'Argentina', 'Colombia', 'Chile', 'Perú'],
  description:
    'Campañas con streamers e influencers de poker online en España y LatAm. Selección por perfil (torneos, cash game, coaching), compliance DGOJ integrado y activación en menos de 72 horas.',
};

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: 'Servicios', url: absoluteUrl('/servicios') },
  { name: 'Influencers Poker', url: absoluteUrl('/influencers-poker') },
]);

const FAQS = [
  {
    q: '¿Qué perfil de streamer de poker funciona mejor según el operador?',
    a: 'Depende del producto. Un operador enfocado a torneos (MTT, Sit&Go, satelites) rinde mejor con streamers que emiten sus propias jornadas de torneo y comparten deep runs, análisis de manos y coaching post. Un operador de cash game rinde mejor con streamers de mesa larga que muestran ritmo sostenido, gestión de bankroll y decisiones matemáticas. Los operadores con formatos híbridos y freerolls suelen combinar ambos perfiles + eventuales creadores generalistas de casino con audiencia curiosa por poker.',
  },
  {
    q: '¿Poker cae bajo la normativa DGOJ en España?',
    a: 'Sí. El póker online es una modalidad de juego regulada en España y sigue el mismo marco publicitario que casino y sportsbook: Real Decreto 958/2020, ventana horaria 1:00-5:00 para la promoción explícita del bono/enlace, prohibición de bonos de bienvenida en creatividades, disclaimers +18 y llamada a participación responsable. El operador debe tener licencia DGOJ vigente en la modalidad de póker. SocialPro aplica el mismo protocolo iGaming que en casino.',
  },
  {
    q: '¿Cómo se rastrean las conversiones de una campaña de poker?',
    a: 'Igual que en casino y sportsbook: enlace de afiliado único por streamer + código de referido personal. Las conversiones (registros, primeros depósitos, buy-ins) se atribuyen desde el panel del propio operador y se reportan por creador y por mercado. El reporting final usa datos del sistema del operador, no estimaciones. Los operadores de poker suelen añadir KPIs específicos como buy-ins totales o rake generado por jugador atribuido, que se incorporan al informe si el brief lo pide.',
  },
  {
    q: '¿En qué mercados hispanohablantes tenéis capacidad de activación en poker?',
    a: 'España como mercado principal, con perfiles establecidos. En LatAm cubrimos México, Argentina, Colombia, Chile y Perú siguiendo el mismo modelo cross-mercado del resto de servicios iGaming. La densidad de creadores especializados exclusivamente en poker es menor que en casino o sportsbook — para campañas grandes solemos combinar streamers propios de poker con creadores generalistas de casino cuyo perfil de audiencia encaje. La preselección se hace por brief.',
  },
  {
    q: '¿Cuánto tarda en activarse una campaña de poker online?',
    a: '72 horas desde el brief firmado, igual que casino y sportsbook. Para campañas ligadas a eventos concretos (series de torneos como WSOP Online, satélites a eventos live) recomendamos empezar el proceso con 10-14 días de antelación para preseleccionar creadores y coordinar la parrilla de contenido pre/durante/post evento.',
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
  { stat: '6 países', label: 'España + 5 mercados LatAm' },
  { stat: '<72h', label: 'De briefing a campaña activa' },
  { stat: 'DGOJ', label: 'Compliance España integrado' },
];

const PORQUES = [
  {
    title: 'Selección por perfil de producto',
    desc: 'Torneos, cash game, coaching, freerolls. Cada operador de poker tiene un ángulo distinto y el streamer óptimo cambia. SocialPro preselecciona creadores por producto y por mercado antes del primer brief público.',
  },
  {
    title: 'Compliance DGOJ desde el primer brief',
    desc: 'Póker es modalidad regulada en España — RD 958/2020 aplica idéntico que a casino. Ventana horaria, disclaimers +18 y prohibición de bonos de bienvenida en creatividades como estándar operativo.',
  },
  {
    title: 'Combinamos con audiencias adyacentes',
    desc: 'La densidad de creadores exclusivos de poker es menor que la de casino. Cuando el brief lo requiere, combinamos streamers propios de poker con creadores generalistas de casino cuya audiencia haya mostrado receptividad a producto de poker.',
  },
];

const COMO_FUNCIONA = [
  { step: '01', title: 'Brief del operador', desc: 'Producto (torneos, cash game, coaching, freerolls, satélites), mercados objetivo, presupuesto, objetivos (registros, FTDs, buy-ins) y assets técnicos DGOJ-compliant.' },
  { step: '02', title: 'Preselección por producto', desc: 'Elegimos streamers de poker cuyo formato de contenido encaje con el producto (torneo largo, mesa cash, coaching sesión). Combinación con creadores generalistas si el brief lo pide.' },
  { step: '03', title: 'Activación 72h', desc: 'Streamers emitiendo con disclaimer +18, enlace único y ventana horaria respetada por mercado. Cobertura sostenida o por evento según el brief.' },
  { step: '04', title: 'Reporting operador', desc: 'Registros, FTDs, buy-ins y rake generado por creador — extraído del panel del operador. KPIs específicos de poker (rake, buy-in medio, retención por serie) si el brief los pide.' },
];

export default function InfluencersPokerPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />

      {/* Hero */}
      <section className="bg-sp-black pt-24 pb-12 md:pt-32 md:pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-4">
            Influencers Poker · España y LatAm
          </p>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-tight mb-6">
            <span style={g}>Streamers de poker online</span> para el mercado hispano
          </h1>
          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto mb-6">
            <GlossaryText linkClassName="text-white/80 underline underline-offset-2 decoration-sp-orange/60 hover:decoration-sp-orange transition-colors">
              {`SocialPro es la agencia de streamers e influencers de poker online para España y LatAm. Selección de creadores por perfil (torneos, cash game, coaching), compliance DGOJ integrado por defecto y activación en menos de 72 horas. Para operadores de poker que buscan activar por producto, no por alcance nominal.`}
            </GlossaryText>
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
            ctaId="landing_poker_hero"
            className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
          >
            Activar streamers de poker para tu operador
          </TrackedCtaLink>
        </div>
      </section>

      {/* Por qué SocialPro */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Por qué SocialPro</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-6">
            ¿Por qué activar poker con una agencia especializada en iGaming?
          </h2>
          <p className="text-base text-sp-muted leading-relaxed mb-10 max-w-3xl">
            El póker online es una vertical iGaming con dinámica propia. Un streamer que rinde
            en cash game no necesariamente convierte para torneos, y un creador generalista de
            casino puede o no tener audiencia con interés real en el producto de poker. Al ser
            una modalidad de juego regulada en España — con las mismas exigencias DGOJ que
            casino y sportsbook — el brief debe pasar por el mismo protocolo de compliance.
            SocialPro aplica el mismo procedimiento iGaming a poker que a cualquier otro
            producto de juego, y preselecciona el roster por formato de contenido (torneo largo,
            mesa cash, sesión de coaching) antes de la primera activación pública.
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
            De briefing a campaña de poker activa en 4 pasos
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

      {/* Capacidad — sin caso específico */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Capacidad</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-6">
            Marco operativo iGaming aplicado a poker
          </h2>
          <p className="text-base text-sp-muted leading-relaxed mb-8 max-w-3xl">
            Poker no tiene un caso de estudio público con cifras específicas todavía. Lo que
            aportamos a un operador de poker es exactamente el mismo marco operativo que hemos
            aplicado en campañas iGaming publicadas: 340+ FTDs verificados en{' '}
            <Link href="/casos/onewin" className="font-semibold text-sp-orange hover:underline">
              la campaña 1WIN
            </Link>
            , 200.000€ de volumen atribuido en{' '}
            <Link href="/casos/skinsmonkey" className="font-semibold text-sp-orange hover:underline">
              SkinsMonkey
            </Link>
            , compliance DGOJ integrado por defecto y activación multipaís desde un brief central.
            El mecanismo de atribución (enlace único por creador, reporting desde el panel del
            operador) es idéntico. Lo que cambia es el perfil de streamer preseleccionado y los
            KPIs específicos (registros, buy-ins, rake generado).
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-sp-off rounded-2xl border border-sp-border p-8">
              <div className="font-display text-2xl font-black text-sp-dark mb-2">Formatos que activamos</div>
              <ul className="text-sm text-sp-muted leading-relaxed space-y-1">
                <li>· MTT (Multi-Table Tournaments)</li>
                <li>· Sit &amp; Go</li>
                <li>· Cash game (mesas de límite fijo y no limit)</li>
                <li>· Freerolls y series de torneos</li>
                <li>· Coaching, análisis de manos y estrategia</li>
                <li>· Satélites a eventos live</li>
              </ul>
            </div>
            <div className="bg-sp-off rounded-2xl border border-sp-border p-8">
              <div className="font-display text-2xl font-black text-sp-dark mb-2">Reporting acordado</div>
              <ul className="text-sm text-sp-muted leading-relaxed space-y-1">
                <li>· Registros atribuidos por creador</li>
                <li>· FTDs (primeros depósitos) por streamer</li>
                <li>· Buy-ins totales y buy-in medio</li>
                <li>· Rake generado por jugador atribuido</li>
                <li>· Retención por serie de torneos</li>
                <li>· Todos los KPIs desde el panel del operador</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="bg-sp-off py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Compliance</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-6">
            DGOJ y equivalentes LatAm para poker online
          </h2>
          <div className="space-y-4 text-base text-sp-muted leading-relaxed">
            <p>
              Según el marco regulatorio vigente en España a 2026, el póker online es una
              modalidad de juego regulada en España y sigue el mismo marco publicitario que
              casino y sportsbook. El{' '}
              <strong className="text-sp-dark">Real Decreto 958/2020</strong> aplica idéntico:
              ventana horaria 1:00-5:00, prohibición de bonos de bienvenida en creatividades,
              disclaimers +18 obligatorios y llamada a participación responsable. El operador
              debe tener licencia DGOJ vigente en la modalidad de póker específicamente. Ver{' '}
              <Link href="/guia-dgoj-igaming-influencers" className="font-semibold text-sp-orange hover:underline">
                guía DGOJ completa
              </Link>.
            </p>
            <p>
              En LatAm cada mercado regula el poker online de forma distinta —{' '}
              Coljuegos en Colombia contempla la modalidad; SEGOB en México y regulación por
              provincia en Argentina tienen aproximaciones específicas. SocialPro solo activa
              mercados donde el operador acredita licencia local válida para la modalidad de
              póker.
            </p>
            <p>
              Todo contenido patrocinado incluye disclaimer +18 y llamada a{' '}
              <Link href="/sorteos/participacion-responsable" className="font-semibold text-sp-orange hover:underline">
                participación responsable
              </Link>.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ visible */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">FAQ</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-8">
            Preguntas frecuentes sobre influencer marketing en poker
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
            Si tu operador combina poker con casino, revisa nuestra{' '}
            <Link href="/agencia-influencers-casino" className="font-semibold text-sp-orange hover:underline">
              agencia de influencers casino
            </Link>
            . Si añades sportsbook, mira{' '}
            <Link href="/streamers-apuestas-deportivas" className="font-semibold text-sp-orange hover:underline">
              streamers de apuestas deportivas
            </Link>
            . Para el marco regulatorio detallado, consulta la{' '}
            <Link href="/guia-dgoj-igaming-influencers" className="font-semibold text-sp-orange hover:underline">
              guía DGOJ
            </Link>{' '}
            o nuestros{' '}
            <Link href="/servicios/igaming" className="font-semibold text-sp-orange hover:underline">
              servicios iGaming
            </Link>.
          </p>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-sp-black py-16 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-3xl font-black uppercase text-white mb-4">
            ¿Listo para activar tu campaña de{' '}
            <span style={g}>poker con streamers hispanos?</span>
          </h2>
          <p className="text-white/50 mb-8">
            Cuéntanos el producto (torneos, cash game, coaching, satélites), tu licencia por
            mercado y tus objetivos. Diseñamos la selección de streamers de poker y la propuesta
            de activación DGOJ-compliant en 48 horas.
          </p>
          <TrackedCtaLink
            href="/contacto?type=brand"
            ctaId="landing_poker_footer"
            className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
          >
            Solicitar propuesta
          </TrackedCtaLink>
        </div>
      </section>

      <StickyCtaMobile
        href="/contacto?type=brand"
        label="Solicitar propuesta"
        ctaId="sticky_poker_mobile"
      />
    </>
  );
}
