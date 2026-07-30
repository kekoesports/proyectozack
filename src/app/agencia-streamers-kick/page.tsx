import type { Metadata } from 'next';
import Link from 'next/link';

import { safeJsonLd } from '@/lib/safeJsonLd';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';
import { TrackedCtaLink } from '@/components/ui/TrackedCtaLink';
import { buildBreadcrumbJsonLd } from '@/lib/utils/breadcrumbs';
import { StickyCtaMobile } from '@/components/ui/StickyCtaMobile';
import { GlossaryText } from '@/components/ui/GlossaryText';

export const metadata: Metadata = {
  title: 'Agencia de Streamers Kick — Patrocinios y Campañas en Kick',
  description:
    'Agencia especializada en streamers de Kick en España y LatAm. Patrocinios en Kick con creadores verificados, activación en menos de 72 horas y reporting con datos del propio operador.',
  alternates: { canonical: '/agencia-streamers-kick' },
  openGraph: {
    title: 'Agencia de Streamers Kick | SocialPro',
    description:
      'Campañas y patrocinios con streamers de Kick en España y LatAm. Reporting con datos verificables, activación <72h.',
    url: absoluteUrl('/agencia-streamers-kick'),
    siteName: 'SocialPro',
    locale: 'es_ES',
    type: 'website',
    images: [{
      url: absoluteUrl('/og-socialpro.png'),
      width: 1200,
      height: 630,
      alt: 'Agencia de streamers Kick — SocialPro',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agencia de Streamers Kick | SocialPro',
    description:
      'Patrocinios en Kick con streamers verificados en España y LatAm. Activación <72h.',
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
  name: 'Agencia de Streamers Kick',
  serviceType: 'Kick Streamer Marketing',
  inLanguage: 'es',
  provider: { '@type': 'Organization', '@id': absoluteUrl('/#organization'), name: 'SocialPro', url: SITE_URL },
  areaServed: ['España', 'México', 'Argentina', 'Colombia', 'Chile', 'Perú'],
  description:
    'Patrocinios y campañas con streamers de Kick en España y LatAm. Selección de talento por vertical, reporting con datos del operador y activación en menos de 72 horas.',
};

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: 'Servicios', url: absoluteUrl('/servicios') },
  { name: 'Agencia de Streamers Kick', url: absoluteUrl('/agencia-streamers-kick') },
]);

const FAQS = [
  {
    q: '¿Por qué contratar streamers de Kick y no solo de Twitch?',
    a: 'Kick opera un revenue share del 95/5 (frente al 50/50 histórico de Twitch) y una política publicitaria más permisiva con casino y crypto. Eso ha atraído a creadores hispanohablantes con audiencias muy fieles al modelo de streaming largo, y ha generado una comunidad de espectadores con perfil de compra distinto — más receptivos a integraciones de casino, sportsbook y skins. Para operadores con producto que Twitch limita o prohíbe, Kick es hoy el canal donde la audiencia consume esos contenidos de forma nativa.',
  },
  {
    q: '¿Qué verticales funcionan mejor en Kick?',
    a: 'iGaming (casino y sportsbook), CS2 skins y case opening, crypto y trading, poker en directo y esports en general. Kick permite streaming de gambling en tiempo real con muchas menos restricciones que Twitch — eso lo convierte en la plataforma preferida para activaciones donde el contenido en directo del producto es el core del brief (spinning slots, apertura de cajas, jugadas de blackjack). Contenido gaming general y competitivo también funciona; simplemente compite más directamente con Twitch por reach.',
  },
  {
    q: '¿Cómo se rastrean las conversiones en un patrocinio de Kick?',
    a: 'Igual que en cualquier plataforma de streaming: código de referido único por streamer + enlace de afiliado del operador. Las conversiones se atribuyen desde el panel del propio operador (FTDs, depósitos, aperturas, trades) y no dependen de la plataforma de streaming. SocialPro entrega reporting con datos operativos, no con estimaciones de alcance de Kick, que por diseño son menos transparentes que las de Twitch.',
  },
  {
    q: '¿Kick es legal para promocionar casino en España?',
    a: 'La plataforma es legal — la actividad promocional es la que debe cumplir la normativa DGOJ del Real Decreto 958/2020: ventana horaria 1:00-5:00 para contenido de juego real dirigido al mercado español, disclaimers +18, prohibición de bonos de bienvenida en creatividades, etc. SocialPro aplica el mismo protocolo iGaming en Kick que en Twitch para el mercado español, y coordina con el operador la ventana publicitaria correspondiente en cada mercado LatAm.',
  },
  {
    q: '¿En qué mercados hispanohablantes tenéis roster activo de Kick?',
    a: 'España como mercado principal, con creadores establecidos en las verticales de iGaming y CS2. En LatAm cubrimos México, Argentina, Chile y Colombia con streamers locales que ya emiten en Kick. Perú tiene menor densidad de creadores en Kick pero podemos activar campañas cross-plataforma cuando el mercado lo requiere. La preselección de talento se hace por mercado y vertical.',
  },
  {
    q: '¿Cuánto tarda en activarse una campaña con streamers de Kick?',
    a: 'Desde el brief firmado hasta el primer streamer emitiendo contenido patrocinado en Kick, el estándar operativo es de 72 horas. Requiere que el operador tenga los assets técnicos (link de afiliado, código único, materiales gráficos) y el mercado objetivo definido. Activaciones multipaís se coordinan en la misma ventana.',
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
  { stat: '95/5', label: 'Revenue share Kick vs 50/50 histórico Twitch' },
  { stat: '<72h', label: 'De briefing a campaña activa' },
  { stat: '6 países', label: 'España + 5 mercados LatAm' },
];

const PORQUES = [
  {
    title: 'Plataforma que sí admite tu producto',
    desc: 'Casino en directo, apertura de cajas, sportsbook, crypto — verticales donde Twitch impone restricciones que Kick no aplica. Si tu producto requiere streaming del gameplay real, Kick es la plataforma donde ocurre.',
  },
  {
    title: 'Audiencia hispana con intención comercial',
    desc: 'La comunidad hispanohablante de Kick tiene un perfil más receptivo a integraciones de producto que la media de streaming: consume contenido largo, sostenido y con menor rotación entre creadores.',
  },
  {
    title: 'Multipaís desde un único brief',
    desc: 'Activamos streamers de Kick en España, México, Argentina, Colombia y Chile con coordinación central. Un solo brief, cinco mercados simultáneos, reporting agregado por operador.',
  },
];

const COMO_FUNCIONA = [
  { step: '01', title: 'Brief del operador', desc: 'Producto, vertical (casino, CS2 skins, crypto, sportsbook), mercados objetivo, presupuesto y assets técnicos.' },
  { step: '02', title: 'Preselección Kick', desc: 'Elegimos entre nuestro roster los streamers de Kick que mejor encajan con la vertical y los mercados, con datos de retención media y perfil de audiencia.' },
  { step: '03', title: 'Activación 72h', desc: 'Streamers emitiendo con disclaimer +18, código único y CTA claro. Ventana publicitaria coordinada con el operador para cumplir la normativa local.' },
  { step: '04', title: 'Reporting operador', desc: 'Informe con FTDs, depósitos, aperturas o KPI acordado — desde el panel del operador, no desde métricas de la plataforma de streaming.' },
];

export default function AgenciaStreamersKickPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />

      {/* Hero */}
      <section className="bg-sp-black pt-24 pb-12 md:pt-32 md:pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-4">
            Agencia de streamers Kick · España y LatAm
          </p>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-tight mb-6">
            <span style={g}>Patrocinios en Kick</span> con streamers verificados
          </h1>
          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto mb-6">
            <GlossaryText linkClassName="text-white/80 underline underline-offset-2 decoration-sp-orange/60 hover:decoration-sp-orange transition-colors">
              {`SocialPro es la agencia de streamers de Kick para el mercado hispanohablante. Activamos campañas con creadores verificados en España y LatAm — iGaming, CS2 skins, sportsbook y crypto — con conversiones rastreadas desde el panel del propio operador y activación en menos de 72 horas. Kick figura como partner en nuestra home.`}
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
            ctaId="landing_kick_hero"
            className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
          >
            Activar streamers de Kick para tu campaña
          </TrackedCtaLink>
        </div>
      </section>

      {/* Por qué Kick */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Por qué SocialPro</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-6">
            ¿Por qué patrocinar streamers de Kick en el mercado hispano?
          </h2>
          <p className="text-base text-sp-muted leading-relaxed mb-10 max-w-3xl">
            Kick no es Twitch con otro logo. Es una plataforma con reglas económicas distintas
            (revenue share 95/5 frente al 50/50 histórico de Twitch), una política publicitaria
            más permisiva con verticales como casino y crypto, y una audiencia hispana que ha
            migrado buscando exactamente ese entorno menos restrictivo. Para operadores con
            productos que Twitch limita o prohíbe emitir en directo, Kick es hoy la plataforma
            donde el contenido nativo del producto — ruleta girando, cajas abriéndose, apuestas
            en directo — ocurre sin fricciones. SocialPro trabaja con creadores hispanos que ya
            emiten en Kick y conoce cómo se comportan sus audiencias frente a integraciones
            comerciales.
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
            De briefing a campaña activa en Kick en 4 pasos
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
            Datos reales de campañas cross-plataforma
          </h2>
          <p className="text-base text-sp-muted leading-relaxed mb-8 max-w-3xl">
            Las campañas de SocialPro que incluyen streamers de Kick suelen ser cross-plataforma
            (Kick + Twitch + YouTube), lo que hace que la atribución específica a Kick esté
            agregada con el resto del reporting. Las cifras verificables del ecosistema iGaming
            de la agencia son las de{' '}
            <Link href="/casos/onewin" className="font-semibold text-sp-orange hover:underline">
              1WIN
            </Link>
            {' '}(340+ FTDs, 100+ creadores, 8M reach) y de{' '}
            <Link href="/casos/skinsmonkey" className="font-semibold text-sp-orange hover:underline">
              SkinsMonkey
            </Link>
            {' '}(200.000€ trading volume atribuido). Kick aporta a estas activaciones el
            componente de streaming largo con verticales que Twitch no admite.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-sp-off rounded-2xl border border-sp-border p-8">
              <div className="font-display text-4xl font-black text-sp-dark mb-1">1WIN</div>
              <div className="text-sp-orange text-xs font-bold uppercase tracking-wider mb-3">
                iGaming multipaís
              </div>
              <p className="text-sm text-sp-muted leading-relaxed">
                Activación con creadores hispanohablantes cross-plataforma (Kick + Twitch), 340+
                FTDs verificados desde el panel del operador. Kick permitió emitir sesiones
                largas de casino en directo, contenido que Twitch restringe.
              </p>
            </div>
            <div className="bg-sp-off rounded-2xl border border-sp-border p-8">
              <div className="font-display text-4xl font-black text-sp-dark mb-1">SkinsMonkey</div>
              <div className="text-sp-orange text-xs font-bold uppercase tracking-wider mb-3">
                CS2 skins marketplace
              </div>
              <p className="text-sm text-sp-muted leading-relaxed">
                200.000€ en volumen de trading atribuidos a creadores del roster, parte del cual
                se activó en Kick con contenido nativo de apertura y trading. Datos desde el
                panel del marketplace, no desde métricas de plataforma.
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
            Marco regulatorio en Kick — DGOJ y equivalentes LatAm
          </h2>
          <div className="space-y-4 text-base text-sp-muted leading-relaxed">
            <p>
              Que Kick admita técnicamente streaming de casino no exime del cumplimiento
              regulatorio. Según el marco regulatorio vigente en España a 2026, para el
              mercado español rige el{' '}
              <strong className="text-sp-dark">Real Decreto 958/2020</strong>: ventana
              horaria 1:00-5:00 para contenido de juego real, prohibición de bonos de
              bienvenida en creatividades y disclaimers +18 obligatorios. SocialPro aplica
              el mismo protocolo iGaming en Kick que en cualquier otra plataforma.
            </p>
            <p>
              En LatAm cada mercado tiene su propia normativa (Colombia con Coljuegos, Argentina
              por provincia, México con SEGOB, etc.). La activación se coordina con el operador
              para respetar la ventana y los disclaimers aplicables en cada jurisdicción. Ver{' '}
              <Link href="/guia-dgoj-igaming-influencers" className="font-semibold text-sp-orange hover:underline">
                guía DGOJ de influencer marketing en España
              </Link>{' '}
              para más detalle.
            </p>
            <p>
              Todo contenido patrocinado en Kick incluye disclaimer +18 y llamada a{' '}
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
            Preguntas frecuentes sobre patrocinios en Kick
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
            Muchos de estos creadores también emiten en Twitch — mira nuestra{' '}
            <Link href="/twitch-streamers-agency" className="font-semibold text-sp-orange hover:underline">
              agencia de streamers Twitch
            </Link>
            . Si tu vertical es casino o sportsbook, revisa nuestros{' '}
            <Link href="/servicios/igaming" className="font-semibold text-sp-orange hover:underline">
              servicios iGaming
            </Link>
            {' '}con compliance DGOJ, específicos para{' '}
            <Link href="/agencia-influencers-casino" className="font-semibold text-sp-orange hover:underline">
              casino
            </Link>
            ,{' '}
            <Link href="/streamers-apuestas-deportivas" className="font-semibold text-sp-orange hover:underline">
              sportsbook
            </Link>
            {' '}o{' '}
            <Link href="/influencers-poker" className="font-semibold text-sp-orange hover:underline">
              poker
            </Link>
            . Para CS2 skins y case opening, tenemos landing especializada en{' '}
            <Link href="/marketing-skins-cs2" className="font-semibold text-sp-orange hover:underline">
              marketing de skins CS2
            </Link>.
          </p>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-sp-black py-16 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="font-display text-3xl font-black uppercase text-white mb-4">
            ¿Listo para activar tu campaña con{' '}
            <span style={g}>streamers de Kick hispanos?</span>
          </h2>
          <p className="text-white/50 mb-8">
            Cuéntanos tu producto, vertical (casino, sportsbook, CS2 skins, crypto) y mercados
            objetivo. Diseñamos la selección de streamers de Kick y la propuesta de activación
            en 48 horas.
          </p>
          <TrackedCtaLink
            href="/contacto?type=brand"
            ctaId="landing_kick_footer"
            className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
          >
            Solicitar propuesta
          </TrackedCtaLink>
        </div>
      </section>

      <StickyCtaMobile
        href="/contacto?type=brand"
        label="Solicitar propuesta"
        ctaId="sticky_kick_mobile"
      />
    </>
  );
}
