import type { Metadata } from 'next';
import Link from 'next/link';

import { safeJsonLd } from '@/lib/safeJsonLd';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';
import { TrackedCtaLink } from '@/components/ui/TrackedCtaLink';
import { buildBreadcrumbJsonLd } from '@/lib/utils/breadcrumbs';
import { StickyCtaMobile } from '@/components/ui/StickyCtaMobile';
import { GlossaryText } from '@/components/ui/GlossaryText';

export const metadata: Metadata = {
  title: 'Agencia de Influencers Casino — Streamers Casino España y LatAm',
  description:
    'Agencia especializada en influencers y streamers de casino online en España y LatAm. Campañas DGOJ-compliant con creadores verificados, FTD tracking desde el panel del operador y activación en menos de 72h.',
  alternates: { canonical: '/agencia-influencers-casino' },
  openGraph: {
    title: 'Agencia de Influencers Casino | SocialPro',
    description:
      'Streamers de casino verificados en España y LatAm. Compliance DGOJ integrado, FTD tracking auditable.',
    url: absoluteUrl('/agencia-influencers-casino'),
    siteName: 'SocialPro',
    locale: 'es_ES',
    type: 'website',
    images: [{
      url: absoluteUrl('/og-socialpro.png'),
      width: 1200,
      height: 630,
      alt: 'Agencia de influencers casino — SocialPro',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agencia de Influencers Casino | SocialPro',
    description:
      'Streamers de casino en España y LatAm. Compliance DGOJ y FTD tracking auditable.',
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
  name: 'Agencia de Influencers Casino',
  serviceType: 'Casino Influencer Marketing',
  inLanguage: 'es',
  provider: { '@type': 'Organization', '@id': absoluteUrl('/#organization'), name: 'SocialPro', url: SITE_URL },
  areaServed: ['España', 'México', 'Argentina', 'Colombia', 'Chile', 'Perú'],
  description:
    'Campañas con streamers e influencers de casino online en España y LatAm. DGOJ compliance integrado, FTD tracking desde el panel del operador y activación en menos de 72 horas.',
};

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: 'Servicios', url: absoluteUrl('/servicios') },
  { name: 'Agencia de Influencers Casino', url: absoluteUrl('/agencia-influencers-casino') },
]);

const FAQS = [
  {
    q: '¿Qué diferencia a una agencia de influencers casino de una agencia gaming general?',
    a: 'Tres cosas. La primera: compliance. Una campaña de casino en España debe respetar el Real Decreto 958/2020 (ventana horaria 1:00-5:00, prohibición de bonos de bienvenida en creatividades, disclaimers +18) y cada mercado LatAm tiene su propia normativa. Una agencia generalista suele aprender esto sobre la marcha. La segunda: el roster. Un streamer que rinde en Valorant no necesariamente convierte para casino — la audiencia es distinta y el consumo también. La tercera: los datos. Un partner iGaming no negocia sobre CPM ni sobre views — negocia sobre FTDs verificados desde el panel del operador. Una agencia sin ese lenguaje no cierra campañas de casino.',
  },
  {
    q: '¿Qué resultados verificables tenéis en campañas de casino?',
    a: 'La cifra pública principal es la campaña 1WIN (Q1-Q2 2025): 340+ FTDs verificados desde el dashboard de afiliados del operador y 8M de alcance en Instagram, con 100+ streamers hispanohablantes activados en simultáneo durante un torneo internacional. El resto de partners iGaming operan bajo NDAs comerciales que no permiten publicar cifras específicas. Todos los datos que ves en esta página vienen del panel del propio operador, no de estimaciones de terceros.',
  },
  {
    q: '¿Cumplís la normativa DGOJ para campañas de casino en España?',
    a: 'Sí. Cada campaña iGaming dirigida al mercado español pasa por nuestro protocolo de compliance DGOJ: ventana publicitaria 1:00-5:00 para contenido de juego real, prohibición de bonos de bienvenida en la creatividad publicitaria, disclaimers +18 obligatorios en todo el contenido patrocinado, y llamada a participación responsable. El operador debe tener licencia DGOJ vigente para operar en España — si no la tiene, no aceptamos la campaña para el mercado español.',
  },
  {
    q: '¿En qué mercados LatAm activáis campañas de casino?',
    a: 'México (SEGOB), Argentina (regulación por provincia — Buenos Aires, Mendoza, Córdoba), Colombia (Coljuegos), Chile (regulación en desarrollo) y Perú (MINCETUR). Coordinamos la ventana publicitaria y los disclaimers aplicables en cada jurisdicción. Los operadores deben acreditar licencia local válida para cada mercado objetivo. LatAm es el 60% del volumen iGaming de la agencia.',
  },
  {
    q: '¿Cómo se atribuye una FTD a un streamer concreto?',
    a: 'Cada streamer recibe un enlace de afiliado único y opcionalmente un código de referido personal. Cuando un espectador se registra y hace su primer depósito, el operador atribuye ese FTD al enlace/código correspondiente. El reporting final agrega los FTDs por creador y por mercado. La atribución la hace el sistema del operador — SocialPro solo lee y reporta lo que el panel del operador registra. Cero estimaciones.',
  },
  {
    q: '¿Cuánto tiempo tarda una campaña de casino en estar activa?',
    a: '72 horas desde el brief firmado hasta el primer streamer emitiendo contenido patrocinado. Requiere que el operador tenga sus assets técnicos listos (link de afiliado por creador o código, materiales gráficos legales) y que el brief incluya mercado objetivo, verticales de juego (slots, live casino, poker, deportes), objetivos de FTD y ventana de campaña.',
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
  { stat: '+340', label: 'FTDs en la campaña 1WIN' },
  { stat: '100+', label: 'Streamers activados en simultáneo' },
  { stat: '8M', label: 'Reach en Instagram (1WIN)' },
];

const PORQUES = [
  {
    title: 'Compliance DGOJ integrado',
    desc: 'Ventana 1:00-5:00, disclaimers +18, prohibición de bonos de bienvenida en creatividades. Cada campaña iGaming en España pasa por nuestro protocolo antes de emitirse. No aprendemos sobre la marcha.',
  },
  {
    title: 'Roster con perfil de casino',
    desc: 'Streamers hispanos con audiencia acostumbrada al contenido de casino online: slots, live casino, ruleta y sportsbook. Perfil de espectador con intención de registro y depósito real.',
  },
  {
    title: 'FTDs desde el panel del operador',
    desc: 'Cada FTD reportado viene del sistema del operador vía enlace de afiliado único por streamer. Sin estimaciones, sin CPMs, sin métricas de terceros. El operador ve exactamente lo mismo que nosotros.',
  },
];

const COMO_FUNCIONA = [
  { step: '01', title: 'Brief del operador', desc: 'Producto (slots, live casino, poker, sportsbook), mercados objetivo, presupuesto, objetivos de FTD y assets técnicos (link afiliado por creador, código, materiales gráficos DGOJ-compliant).' },
  { step: '02', title: 'Preselección de talento', desc: 'Elegimos entre nuestro roster los streamers cuya audiencia mejor convierte para casino en cada mercado objetivo. Preselección basada en datos de campañas anteriores.' },
  { step: '03', title: 'Activación 72h', desc: 'Streamers emitiendo con disclaimer +18, enlace único, respetando la ventana publicitaria del mercado. Cobertura sostenida durante la campaña.' },
  { step: '04', title: 'Reporting operador', desc: 'Informe final con FTDs por streamer y por mercado, extraído del panel del operador. Sin capturas de pantalla ni estimaciones — solo datos del sistema.' },
];

export default function AgenciaInfluencersCasinoPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />

      {/* Hero */}
      <section className="bg-sp-black pt-24 pb-12 md:pt-32 md:pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-4">
            Agencia de influencers casino · España y LatAm
          </p>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-tight mb-6">
            <span style={g}>Streamers de casino</span> con FTDs verificados por el operador
          </h1>
          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto mb-6">
            <GlossaryText linkClassName="text-white/80 underline underline-offset-2 decoration-sp-orange/60 hover:decoration-sp-orange transition-colors">
              {`SocialPro es la agencia especializada en influencers y streamers de casino online en España y LatAm. Campañas DGOJ-compliant con creadores verificados, atribución de FTDs desde el panel del propio operador y activación en menos de 72 horas. Caso público: 340+ FTDs en la campaña 1WIN con 100+ streamers hispanohablantes.`}
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
            ctaId="landing_casino_hero"
            className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
          >
            Activar streamers de casino para tu operador
          </TrackedCtaLink>
        </div>
      </section>

      {/* Por qué SocialPro */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Por qué SocialPro</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-6">
            ¿Por qué una agencia especializada en casino y no una agencia gaming general?
          </h2>
          <p className="text-base text-sp-muted leading-relaxed mb-10 max-w-3xl">
            Un operador de casino online no busca alcance. Busca FTDs verificados y quiere hablar
            con una agencia que entienda el vocabulario del sector — RTP, live casino, cross-sell
            a sportsbook, LTV por mercado — y que sepa por qué el streamer que arrasa en Valorant
            puede convertir mal para slots. SocialPro lleva más de una década en gaming y
            esports, y desde 2024 opera un vertical especializado de campañas iGaming en España
            y seis mercados LatAm. El equipo maneja compliance DGOJ, Coljuegos,
            SEGOB y las regulaciones LatAm que se estabilizan cada trimestre. Cada campaña de
            casino sale del brief con un roster preseleccionado por conversión histórica y no
            por alcance nominal.
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
            De briefing a campaña de casino activa en 4 pasos
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

      {/* Resultados verificados — Caso 1WIN */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Resultados verificados</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-6">
            Caso público 1WIN: 340+ FTDs en una sola activación
          </h2>
          <p className="text-base text-sp-muted leading-relaxed mb-8 max-w-3xl">
            En la campaña iGaming de 1WIN (Q1-Q2 2025), SocialPro activó 100+ streamers
            hispanohablantes en simultáneo durante un torneo internacional, generando 340+ FTDs
            verificados desde el dashboard de afiliados del operador y un alcance de 8 millones
            de usuarios en Instagram. Cada FTD atribuido a un streamer específico vía enlace
            único. El resto de partners iGaming (operadores europeos y LatAm) opera bajo NDAs
            comerciales que no permiten publicar cifras exactas; el modelo operativo es el mismo.{' '}
            <Link href="/casos/onewin" className="font-semibold text-sp-orange hover:underline">
              Ver caso completo →
            </Link>
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-sp-off rounded-2xl border border-sp-border p-8">
              <div className="font-display text-4xl font-black text-sp-dark mb-1">+340</div>
              <div className="text-sp-orange text-xs font-bold uppercase tracking-wider mb-3">
                <Link href="/casos/onewin" className="hover:underline">1WIN · FTDs verificados</Link>
              </div>
              <p className="text-sm text-sp-muted leading-relaxed">
                Datos extraídos del dashboard de afiliados del propio operador. Cada FTD
                atribuido a un streamer concreto vía enlace único. 100+ creadores en simultáneo
                en el mercado hispanohablante durante torneo internacional.
              </p>
            </div>
            <div className="bg-sp-off rounded-2xl border border-sp-border p-8">
              <div className="font-display text-4xl font-black text-sp-dark mb-1">8M</div>
              <div className="text-sp-orange text-xs font-bold uppercase tracking-wider mb-3">
                Alcance Instagram — Campaña 1WIN
              </div>
              <p className="text-sm text-sp-muted leading-relaxed">
                Alcance auditado en Instagram para la campaña 1WIN. Combinación de contenido en
                directo (Twitch/Kick), highlights y activación cross-plataforma en las redes
                personales de los 100+ streamers activados.
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
            DGOJ y equivalentes LatAm — protocolo integrado
          </h2>
          <div className="space-y-4 text-base text-sp-muted leading-relaxed">
            <p>
              Según el marco regulatorio vigente en España a 2026, toda campaña de casino
              dirigida al mercado español cumple el{' '}
              <strong className="text-sp-dark">Real Decreto 958/2020</strong>: ventana
              publicitaria 1:00-5:00 para contenido de juego real, prohibición de bonos de
              bienvenida en creatividades, disclaimers +18 obligatorios y llamada a
              participación responsable. El operador debe tener licencia DGOJ vigente. Ver{' '}
              <Link href="/guia-dgoj-igaming-influencers" className="font-semibold text-sp-orange hover:underline">
                guía DGOJ de influencer marketing en España
              </Link>{' '}
              para detalle operativo completo.
            </p>
            <p>
              Para LatAm coordinamos con las regulaciones locales: Coljuegos (Colombia), SEGOB
              (México), regulación provincial en Argentina, MINCETUR (Perú) y marcos en
              desarrollo en Chile. Ventana horaria y disclaimers ajustados por jurisdicción.
              El operador debe acreditar licencia local válida para cada mercado activado.
            </p>
            <p>
              Cada contenido patrocinado incluye disclaimer +18 y enlace a{' '}
              <Link href="/sorteos/participacion-responsable" className="font-semibold text-sp-orange hover:underline">
                participación responsable
              </Link>
              . El compliance es requisito, no opción.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ visible */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">FAQ</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-8">
            Preguntas frecuentes sobre agencia de influencers casino
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
            Si tu producto es sportsbook además de casino, revisa{' '}
            <Link href="/streamers-apuestas-deportivas" className="font-semibold text-sp-orange hover:underline">
              streamers de apuestas deportivas
            </Link>
            . Si incluyes poker online, mira{' '}
            <Link href="/influencers-poker" className="font-semibold text-sp-orange hover:underline">
              influencers de poker
            </Link>
            . Para plataformas que emiten casino en directo con menos restricciones
            publicitarias, revisa nuestra{' '}
            <Link href="/agencia-streamers-kick" className="font-semibold text-sp-orange hover:underline">
              agencia de streamers Kick
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
            ¿Listo para lanzar tu campaña de{' '}
            <span style={g}>casino con streamers hispanos?</span>
          </h2>
          <p className="text-white/50 mb-8">
            Cuéntanos tu producto (slots, live casino, poker, sportsbook), tu licencia por
            mercado y tus objetivos de FTD. Diseñamos la selección de streamers y la propuesta
            de activación DGOJ-compliant en 48 horas.
          </p>
          <TrackedCtaLink
            href="/contacto?type=brand"
            ctaId="landing_casino_footer"
            className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
          >
            Solicitar propuesta
          </TrackedCtaLink>
        </div>
      </section>

      <StickyCtaMobile
        href="/contacto?type=brand"
        label="Solicitar propuesta"
        ctaId="sticky_casino_mobile"
      />
    </>
  );
}
