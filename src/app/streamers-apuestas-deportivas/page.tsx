import type { Metadata } from 'next';
import Link from 'next/link';

import { safeJsonLd } from '@/lib/safeJsonLd';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';
import { TrackedCtaLink } from '@/components/ui/TrackedCtaLink';
import { buildBreadcrumbJsonLd } from '@/lib/utils/breadcrumbs';
import { StickyCtaMobile } from '@/components/ui/StickyCtaMobile';

export const metadata: Metadata = {
  title: 'Streamers de Apuestas Deportivas — Agencia Sportsbook España y LatAm',
  description:
    'Agencia especializada en streamers e influencers de apuestas deportivas y sportsbook para España y LatAm. Campañas DGOJ-compliant con FTD tracking desde el operador y activación en menos de 72 horas.',
  alternates: { canonical: '/streamers-apuestas-deportivas' },
  openGraph: {
    title: 'Streamers de Apuestas Deportivas | SocialPro',
    description:
      'Influencers y streamers de sportsbook en España y LatAm. FTD tracking auditable, compliance DGOJ integrado.',
    url: absoluteUrl('/streamers-apuestas-deportivas'),
    siteName: 'SocialPro',
    locale: 'es_ES',
    type: 'website',
    images: [{
      url: absoluteUrl('/og-socialpro.png'),
      width: 1200,
      height: 630,
      alt: 'Streamers de apuestas deportivas — SocialPro',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Streamers de Apuestas Deportivas | SocialPro',
    description:
      'Influencers de sportsbook en España y LatAm. Compliance DGOJ y FTD tracking auditable.',
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
  name: 'Streamers de Apuestas Deportivas',
  serviceType: 'Sportsbook Influencer Marketing',
  inLanguage: 'es',
  provider: { '@type': 'Organization', '@id': absoluteUrl('/#organization'), name: 'SocialPro', url: SITE_URL },
  areaServed: ['España', 'México', 'Argentina', 'Colombia', 'Chile', 'Perú'],
  description:
    'Campañas con streamers e influencers de sportsbook y apuestas deportivas en España y LatAm. DGOJ compliance, FTD tracking desde el panel del operador y activación en menos de 72 horas.',
};

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: 'Servicios', url: absoluteUrl('/servicios') },
  { name: 'Streamers de Apuestas Deportivas', url: absoluteUrl('/streamers-apuestas-deportivas') },
]);

const FAQS = [
  {
    q: '¿Qué diferencia una campaña de sportsbook de una de casino?',
    a: 'Ciclo de vida y perfil de espectador. Casino convierte en cualquier momento — sportsbook depende del calendario deportivo: pretemporada, jornada, playoffs, torneos. El streamer de sportsbook trabaja con análisis previos, apuestas en directo durante el partido y post-mortem. Su audiencia consume contenido con patrón semanal (LaLiga, NBA) o por evento (Champions, Superbowl, Mundial). La creatividad publicitaria, la ventana de activación y los KPIs cambian frente a casino. SocialPro adapta el brief a este ciclo.',
  },
  {
    q: '¿Qué deportes funcionan mejor en el mercado hispanohablante?',
    a: 'Fútbol es el core absoluto: LaLiga y Champions en España, Liga MX en México, Copa Libertadores en Sudamérica. Baloncesto NBA tiene tracción alta en México y Argentina. Esports (CS2, Valorant, LoL) crece rápido — nuestro proyecto de referencia en esports betting es apuesta-segura-cs2, un tipster de CS2 tier 2-3 con histórico público en Blogabet. Boxeo y MMA rinden bien puntualmente (Canelo, UFC). El brief de un operador de sportsbook debería priorizar la selección de streamer según el deporte que quiere activar.',
  },
  {
    q: '¿Los tipsters cuentan como creadores de sportsbook?',
    a: 'Sí, y son un perfil específico. Un tipster (analista de apuestas) publica picks con stake y cuota antes del evento; su audiencia le sigue por su histórico documentado. Es un perfil de conversión distinto del streamer generalista de sportsbook: menor volumen de audiencia, pero mucho mayor engagement y mayor tasa de conversión a FTD por espectador. SocialPro trabaja con ambos perfiles y los combina cuando el brief lo permite. El proyecto apuesta-segura-cs2 muestra el modelo de tipster con Blogabet.',
  },
  {
    q: '¿La normativa DGOJ afecta igual a sportsbook que a casino?',
    a: 'Sí. En España, el Real Decreto 958/2020 aplica idéntico para sportsbook y casino: ventana publicitaria 1:00-5:00, prohibición de bonos de bienvenida en creatividades, disclaimers +18 obligatorios y llamada a participación responsable. La única diferencia operativa es que la parrilla de contenido deportivo relevante puede caer fuera de la ventana horaria (partidos de tarde/noche) — el creador puede analizar y previsualizar el partido en cualquier momento, pero la promoción explícita del bono/enlace debe respetar la franja.',
  },
  {
    q: '¿En qué mercados LatAm activáis sportsbook?',
    a: 'México (SEGOB), Argentina (regulación por provincia — Buenos Aires y Mendoza son las más activas), Colombia (Coljuegos con las licencias más consolidadas), Chile (marco en desarrollo) y Perú (MINCETUR). Colombia y México son actualmente los mercados más volumen para sportsbook en la agencia. LatAm supone el 60% del volumen iGaming de SocialPro.',
  },
  {
    q: '¿Cuánto tarda en estar activa una campaña de sportsbook?',
    a: '72 horas desde el brief firmado, igual que casino. Para campañas ligadas a un evento concreto (Champions, Copa América, Superbowl) recomendamos empezar el proceso con 10-14 días de antelación para preseleccionar creadores por deporte y coordinar la parrilla de contenido pre/durante/post evento.',
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
    title: 'Perfil sportsbook, no genérico',
    desc: 'Streamers y tipsters cuya audiencia consume contenido de apuestas deportivas con patrón semanal (jornada de fútbol, NBA) o por evento (Champions, Superbowl). Perfil de conversión distinto al de casino.',
  },
  {
    title: 'Compliance DGOJ integrado',
    desc: 'El RD 958/2020 aplica idéntico a sportsbook. Ventana 1:00-5:00 para la promoción explícita del bono/enlace, disclaimers +18 y prohibición de bonos de bienvenida en creatividades. Protocolo estándar de la agencia.',
  },
  {
    title: 'Sabemos activar por evento',
    desc: 'Champions, Copa América, Superbowl, playoffs NBA, Mundial, MotoGP. Coordinamos parrilla pre/durante/post evento con creadores por deporte y por mercado. No solo activaciones continuas.',
  },
];

const COMO_FUNCIONA = [
  { step: '01', title: 'Brief del operador', desc: 'Producto (sportsbook, live betting), deportes prioritarios, evento ancla si aplica, mercados objetivo, presupuesto, objetivos de FTD y assets técnicos DGOJ-compliant.' },
  { step: '02', title: 'Preselección por deporte', desc: 'Elegimos entre nuestro roster los streamers y tipsters cuya audiencia mejor convierte para el deporte y mercado objetivo. Combinación de perfil generalista + tipster cuando el brief lo pide.' },
  { step: '03', title: 'Activación coordinada', desc: 'Streamers emitiendo con disclaimer +18, enlace único, respetando la ventana horaria. Parrilla pre-partido, en directo y post-mortem para eventos ancla.' },
  { step: '04', title: 'Reporting operador', desc: 'FTDs por streamer, por mercado y por deporte extraídos del panel del operador. Sin capturas ni estimaciones — solo datos del sistema.' },
];

export default function StreamersApuestasDeportivasPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />

      {/* Hero */}
      <section className="bg-sp-black pt-24 pb-12 md:pt-32 md:pb-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-4">
            Streamers de apuestas deportivas · España y LatAm
          </p>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-tight mb-6">
            <span style={g}>Sportsbook</span> con streamers y tipsters hispanohablantes
          </h1>
          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto mb-6">
            SocialPro es la agencia de streamers e influencers de apuestas deportivas para
            España y LatAm. Activamos campañas para operadores de sportsbook con creadores
            especializados por deporte — fútbol, baloncesto, esports, boxeo — con compliance
            DGOJ integrado, atribución de FTDs desde el panel del propio operador y activación
            en menos de 72 horas.
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
            ctaId="landing_sportsbook_hero"
            className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
          >
            Activar streamers de sportsbook para tu operador
          </TrackedCtaLink>
        </div>
      </section>

      {/* Por qué SocialPro */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Por qué SocialPro</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-6">
            ¿Por qué una agencia con perfil específico de sportsbook?
          </h2>
          <p className="text-base text-sp-muted leading-relaxed mb-10 max-w-3xl">
            Sportsbook no es casino con otro logo. El streamer de apuestas deportivas trabaja al
            ritmo del calendario — jornada de LaLiga, playoffs NBA, Champions, Mundial. Sus
            espectadores no buscan entretenimiento continuo sino análisis previo, apuesta en
            directo durante el partido y valoración post. La activación de una campaña de
            sportsbook debe coordinarse con la parrilla deportiva del mercado objetivo, no con
            un patrón semanal genérico. SocialPro trabaja tanto con streamers generalistas de
            sportsbook como con tipsters (analistas con histórico documentado, tipo{' '}
            <Link href="/apuesta-segura-cs2" className="font-semibold text-sp-orange hover:underline">
              apuesta-segura-cs2
            </Link>
            ), y combina ambos perfiles cuando el brief lo permite.
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
            De briefing a campaña de sportsbook activa en 4 pasos
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

      {/* Resultados verificados */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-2">Resultados verificados</p>
          <h2 className="font-display text-3xl font-black uppercase text-sp-dark mb-6">
            Referencias de sportsbook y esports betting
          </h2>
          <p className="text-base text-sp-muted leading-relaxed mb-8 max-w-3xl">
            Muchas campañas iGaming de SocialPro combinan casino + sportsbook porque los
            operadores más grandes (como 1WIN) ofrecen ambos productos. La cifra pública
            principal — 340+ FTDs en{' '}
            <Link href="/casos/onewin" className="font-semibold text-sp-orange hover:underline">
              1WIN
            </Link>
            {' '}— agrega el ecosistema iGaming completo. En esports betting, nuestro proyecto
            de referencia es{' '}
            <Link href="/apuesta-segura-cs2" className="font-semibold text-sp-orange hover:underline">
              apuesta-segura-cs2
            </Link>
            , un canal de tipster de CS2 tier 2-3 con histórico público auditado en Blogabet.
            El resto de partners sportsbook operan bajo NDAs comerciales.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-sp-off rounded-2xl border border-sp-border p-8">
              <div className="font-display text-4xl font-black text-sp-dark mb-1">1WIN</div>
              <div className="text-sp-orange text-xs font-bold uppercase tracking-wider mb-3">
                iGaming — casino + sportsbook
              </div>
              <p className="text-sm text-sp-muted leading-relaxed">
                Campaña multipaís con 100+ streamers hispanos activados en simultáneo, 340+ FTDs
                verificados desde el panel del operador. Producto combinado (casino + sportsbook)
                con activación coordinada a torneo internacional.
              </p>
            </div>
            <div className="bg-sp-off rounded-2xl border border-sp-border p-8">
              <div className="font-display text-4xl font-black text-sp-dark mb-1">Blogabet</div>
              <div className="text-sp-orange text-xs font-bold uppercase tracking-wider mb-3">
                Apuesta Segura CS2 — esports betting
              </div>
              <p className="text-sm text-sp-muted leading-relaxed">
                Proyecto de tipster con picks en abierto y histórico público (yield, ROI, profit)
                auditado por Blogabet. Modelo replicable para partners de esports betting o
                sportsbook tradicional que busquen creador con trazabilidad de rendimiento.
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
            DGOJ y equivalentes LatAm para sportsbook
          </h2>
          <div className="space-y-4 text-base text-sp-muted leading-relaxed">
            <p>
              Según el marco regulatorio vigente en España a 2026, el{' '}
              <strong className="text-sp-dark">Real Decreto 958/2020</strong>{' '}
              aplica idéntico a sportsbook y a casino: ventana 1:00-5:00 para la promoción
              explícita del bono/enlace, prohibición de bonos de bienvenida en creatividades,
              disclaimer +18 y llamada a participación responsable. El operador debe tener
              licencia DGOJ vigente para el mercado español. Ver{' '}
              <Link href="/guia-dgoj-igaming-influencers" className="font-semibold text-sp-orange hover:underline">
                guía DGOJ completa
              </Link>.
            </p>
            <p>
              LatAm cubre Coljuegos (Colombia), SEGOB (México), regulación por provincia en
              Argentina, MINCETUR (Perú) y marco en desarrollo en Chile. La coordinación de la
              ventana y los disclaimers se hace por jurisdicción con el operador. La agencia
              solo activa mercados donde el operador acredita licencia local válida.
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
            Preguntas frecuentes sobre streamers de apuestas deportivas
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
            Si tu producto es casino además de sportsbook, revisa nuestra{' '}
            <Link href="/agencia-influencers-casino" className="font-semibold text-sp-orange hover:underline">
              agencia de influencers casino
            </Link>
            . Si tu portfolio incluye poker online, tenemos landing dedicada de{' '}
            <Link href="/influencers-poker" className="font-semibold text-sp-orange hover:underline">
              influencers poker
            </Link>
            . Para esports betting específicamente en CS2 con histórico público auditable, mira{' '}
            <Link href="/apuesta-segura-cs2" className="font-semibold text-sp-orange hover:underline">
              Apuesta Segura CS2
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
            <span style={g}>sportsbook con streamers hispanos?</span>
          </h2>
          <p className="text-white/50 mb-8">
            Cuéntanos tu producto (sportsbook, live betting), deportes prioritarios, evento ancla
            si aplica y mercados objetivo. Diseñamos la selección de streamers y tipsters, y la
            propuesta de activación DGOJ-compliant en 48 horas.
          </p>
          <TrackedCtaLink
            href="/contacto?type=brand"
            ctaId="landing_sportsbook_footer"
            className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
          >
            Solicitar propuesta
          </TrackedCtaLink>
        </div>
      </section>

      <StickyCtaMobile
        href="/contacto?type=brand"
        label="Solicitar propuesta"
        ctaId="sticky_sportsbook_mobile"
      />
    </>
  );
}
