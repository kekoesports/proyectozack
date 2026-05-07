import type { Metadata } from 'next';
import Link from 'next/link';
import { absoluteUrl, SITE_URL } from '@/lib/site-url';
import { TrackedCtaLink } from '@/components/ui/TrackedCtaLink';

export const metadata: Metadata = {
  title: 'Guía DGOJ: Compliance iGaming con Influencers en España (2026)',
  description:
    'Qué exige la DGOJ a las campañas de iGaming con streamers e influencers en España. Disclaimers, restricciones de audiencia, responsabilidad del operador y proceso de revisión. Guía práctica 2026.',
  alternates: { canonical: '/guia-dgoj-igaming-influencers' },
  openGraph: {
    title: 'Guía DGOJ Compliance iGaming con Influencers 2026 | SocialPro',
    description:
      'Qué exige la regulación española a las campañas de iGaming con streamers. Principios de compliance, responsabilidad del operador y flujo de revisión de contenido.',
    url: absoluteUrl('/guia-dgoj-igaming-influencers'),
    type: 'article',
    images: [{ url: absoluteUrl('/og-default.jpg'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Guía DGOJ iGaming con Influencers 2026 | SocialPro',
    description: 'Compliance DGOJ para campañas de iGaming con streamers en España. Guía práctica 2026.',
    images: [absoluteUrl('/og-default.jpg')],
  },
};

const FAQ_ITEMS = [
  {
    q: '¿Qué es la DGOJ?',
    a: 'La Dirección General de Ordenación del Juego (DGOJ) es el organismo del Ministerio de Consumo español encargado de regular, supervisar y controlar el juego online en España. Cualquier operador que quiera ofrecer servicios de apuestas o casino online en España debe obtener licencia de la DGOJ y cumplir con su marco regulatorio, que incluye las condiciones de publicidad.',
  },
  {
    q: '¿Un operador extranjero sin licencia DGOJ puede activar campañas con streamers en España?',
    a: 'No. La publicidad de juego online en España está reservada a operadores con licencia vigente de la DGOJ. Activar campañas con influencers españoles para un operador sin licencia expone al operador a sanciones y puede generar responsabilidad para el propio creador. En SocialPro verificamos el estado de licencia de cada operador antes de iniciar cualquier proceso de briefing.',
  },
  {
    q: '¿La responsabilidad del contenido del creador recae sobre el operador o sobre el influencer?',
    a: 'Sobre ambos. La normativa de juego responsable en España establece que el operador es corresponsable del contenido generado por influencers que actúan en su nombre. El creador también asume responsabilidad respecto a su audiencia. Esta doble responsabilidad es la razón por la que el proceso de revisión previa no es opcional: protege a las dos partes.',
  },
  {
    q: '¿Qué es el RGIAJ y por qué afecta a las campañas con streamers?',
    a: 'El Registro General de Interdicciones de Acceso al Juego (RGIAJ) es el registro español de personas autoexcluidas del juego. Los operadores con licencia DGOJ están obligados a impedir el acceso de personas inscritas en el RGIAJ a sus plataformas. En el contexto de campañas con influencers, esto refuerza la obligación de no dirigir contenido de iGaming a audiencias vulnerables o autoexcluidas.',
  },
  {
    q: '¿Las restricciones de publicidad iGaming se aplican también en Twitch y YouTube?',
    a: 'Sí. La normativa se aplica al contenido publicitario independientemente de la plataforma. Una integración de iGaming en un directo de Twitch, un vídeo de YouTube patrocinado o una story de Instagram quedan sujetos a los mismos principios de transparencia, identificación como publicidad y restricción de audiencias menores. Las plataformas además tienen sus propias políticas que pueden ser más restrictivas.',
  },
  {
    q: '¿Qué ocurre si un streamer publica contenido iGaming sin respetar el compliance?',
    a: 'El operador puede recibir un requerimiento de la DGOJ y enfrentarse a sanciones que van desde advertencias hasta multas o suspensión de licencia. El creador puede perder colaboraciones futuras en el sector y en algunos casos asumir responsabilidad directa. Por eso en SocialPro exigimos revisión previa de todo el contenido antes de su publicación y no activamos campañas sin ese paso.',
  },
  {
    q: '¿Cuánto tarda el proceso de compliance en SocialPro para una campaña iGaming?',
    a: 'El proceso completo —vetting del creador, briefing legal, revisión del guion de integración y aprobación del operador— dura entre 24 y 48 horas para campañas estándar. Para campañas multiterrritorio o con un número elevado de creadores el proceso puede extenderse 3-5 días hábiles. Desde la aprobación final hasta el creador en directo, la activación es inferior a 72 horas.',
  },
  {
    q: '¿La regulación iGaming en LATAM es igual que en España?',
    a: 'No. Cada país latinoamericano tiene su propio marco regulatorio para el juego online, y varía significativamente. México, Colombia y Argentina tienen regulaciones propias en distintos estados de maduración. Chile y Perú están en proceso de regulación. SocialPro adapta el compliance y la selección de creadores a la normativa local de cada mercado antes de activar cualquier campaña en LATAM.',
  },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      '@id': absoluteUrl('/guia-dgoj-igaming-influencers#article'),
      headline: 'Guía DGOJ: Compliance iGaming con Influencers en España (2026)',
      description:
        'Qué exige la DGOJ a las campañas de iGaming con streamers e influencers en España. Principios de compliance, responsabilidad del operador y flujo de revisión de contenido.',
      url: absoluteUrl('/guia-dgoj-igaming-influencers'),
      inLanguage: 'es',
      image: absoluteUrl('/og-default.jpg'),
      datePublished: '2026-05-07',
      dateModified: '2026-05-07',
      author: {
        '@type': 'Person',
        '@id': absoluteUrl('/#founder-pablo'),
        name: 'Pablo Camacho',
        alternateName: 'Kekō',
        jobTitle: 'CEO, SocialPro',
      },
      publisher: { '@type': 'Organization', '@id': absoluteUrl('/#organization') },
      mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl('/guia-dgoj-igaming-influencers') },
      about: {
        '@type': 'Thing',
        name: 'DGOJ compliance iGaming influencers España',
      },
    },
    {
      '@type': 'FAQPage',
      '@id': absoluteUrl('/guia-dgoj-igaming-influencers#faq'),
      mainEntity: FAQ_ITEMS.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Servicios iGaming', item: absoluteUrl('/servicios/igaming') },
        { '@type': 'ListItem', position: 3, name: 'Guía DGOJ', item: absoluteUrl('/guia-dgoj-igaming-influencers') },
      ],
    },
  ],
};

const g = {
  background: 'linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%)',
  WebkitBackgroundClip: 'text' as const,
  WebkitTextFillColor: 'transparent' as const,
  backgroundClip: 'text' as const,
};

export default function GuiaDgojPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── Hero ── */}
      <section className="bg-sp-black pt-32 pb-16">
        <div className="max-w-3xl mx-auto px-6">
          <Link
            href="/servicios/igaming"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors mb-8"
          >
            <span aria-hidden="true">&larr;</span> Servicios iGaming
          </Link>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-sp-orange mb-4">
            Compliance · España · 2026
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-black uppercase tracking-tight text-white leading-tight mb-6">
            Guía DGOJ: Compliance iGaming con{' '}
            <span style={g}>Influencers</span>
          </h1>
          <p className="text-lg text-white/60 leading-relaxed mb-8">
            Qué exige la Dirección General de Ordenación del Juego a los operadores que activan
            campañas con streamers e influencers en España. Principios de compliance, responsabilidad
            del operador y proceso de revisión de contenido.
          </p>

          {/* Author byline */}
          <div className="flex items-center gap-3 border-t border-white/10 pt-6">
            <div className="w-9 h-9 rounded-full bg-sp-orange/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-black text-sp-orange">PC</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Pablo &ldquo;Kekō&rdquo; Camacho
              </p>
              <p className="text-xs text-white/40">CEO, SocialPro · 14 años en gaming e iGaming · Última revisión: mayo 2026</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Disclaimer ── */}
      <div className="bg-sp-orange/10 border-y border-sp-orange/20">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <p className="text-xs text-white/60 leading-relaxed">
            <strong className="text-white/80">Aviso:</strong> Este contenido es informativo y no constituye
            asesoramiento legal. La regulación del juego online en España puede cambiar. Para decisiones
            específicas, consulta directamente con la{' '}
            <a
              href="https://www.ordenacionjuego.es"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sp-orange hover:underline"
            >
              DGOJ
            </a>{' '}
            o con un asesor legal especializado en juego regulado.
          </p>
        </div>
      </div>

      {/* ── Body ── */}
      <article className="bg-white py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-6">

          {/* Intro */}
          <p className="text-base text-sp-muted leading-relaxed mb-12">
            La publicidad de juego online en España está sujeta a un marco regulatorio específico
            gestionado por la DGOJ. Desde la entrada en vigor del Real Decreto 958/2020, las
            condiciones para que los operadores con licencia puedan publicitar sus servicios —incluidas
            las campañas con influencers y streamers— se han vuelto más exigentes. Esta guía recoge
            los principios generales que cualquier operador debe conocer antes de activar una campaña
            con creadores de contenido en España.
          </p>

          {/* Q&A sections */}
          <div className="space-y-14">

            <section>
              <h2 className="font-display text-2xl font-black uppercase tracking-tight text-sp-dark mb-4">
                ¿Qué es la DGOJ y por qué regula las campañas con influencers?
              </h2>
              <p className="text-base text-sp-muted leading-relaxed">
                La Dirección General de Ordenación del Juego (DGOJ) es el organismo del Ministerio
                de Consumo español que regula, autoriza y supervisa el juego online en España. Cualquier
                operador que ofrezca apuestas deportivas, casino, póker u otros juegos de azar online
                a jugadores españoles debe tener licencia vigente de la DGOJ y cumplir con su marco
                regulatorio. Esto incluye la publicidad: los operadores son responsables de que todas
                sus comunicaciones comerciales —incluidas las realizadas a través de influencers,
                streamers o creadores de contenido— cumplan con la normativa vigente. La DGOJ puede
                sancionar al operador por contenido no conforme generado por un influencer que actúe
                en su nombre, lo que hace que el proceso de revisión previa sea una obligación
                operativa para cualquier agencia o equipo de marketing que trabaje en este sector.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-black uppercase tracking-tight text-sp-dark mb-4">
                ¿Qué requisito de identificación como publicidad exige la normativa?
              </h2>
              <p className="text-base text-sp-muted leading-relaxed">
                Toda comunicación comercial de un operador iGaming debe identificarse claramente como
                publicidad. En el contexto de campañas con streamers, esto implica que el creador
                debe indicar de forma visible y explícita que el contenido es una colaboración
                patrocinada, tanto durante la integración como en la descripción del vídeo o directo
                si la plataforma lo permite. La distinción entre contenido editorial y contenido
                pagado no puede quedar ambigua. Una integración de iGaming presentada como una
                recomendación personal sin identificación publicitaria no cumple con la normativa.
                En SocialPro, el briefing de cada campaña incluye un apartado específico sobre las
                formas de identificación requeridas según la plataforma (Twitch, YouTube, Instagram,
                Kick) y el mercado de destino, y este punto se verifica en la revisión previa del
                guion de integración.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-black uppercase tracking-tight text-sp-dark mb-4">
                ¿Qué mensaje de juego responsable debe incluir el contenido del streamer?
              </h2>
              <p className="text-base text-sp-muted leading-relaxed">
                La normativa española exige que la publicidad de juego online incluya mensajes de
                juego responsable. En la práctica de campañas con influencers, esto se traduce en
                que el creador debe incorporar una mención explícita al juego responsable en el
                contenido patrocinado: avisos como &ldquo;juega con responsabilidad&rdquo;, referencias a los
                límites de depósito o mención al servicio de autoexclusión RGIAJ son formas habituales
                de cumplir este requisito. El momento y la forma exacta en que debe aparecer este
                mensaje pueden variar según la interpretación del operador y su equipo legal. Por
                eso en SocialPro cada operador valida el guion de integración antes de la publicación:
                el mensaje de juego responsable es un punto de revisión obligatorio que no puede
                omitirse en ninguna campaña que gestionamos.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-black uppercase tracking-tight text-sp-dark mb-4">
                ¿Cómo se restringe la publicidad iGaming a menores de edad?
              </h2>
              <p className="text-base text-sp-muted leading-relaxed">
                Los operadores con licencia DGOJ no pueden dirigir publicidad de juego online a
                menores de 18 años. En campañas con influencers, esta obligación se traduce en la
                necesidad de verificar que la audiencia del creador cumple con el perfil demográfico
                requerido: si el canal tiene una presencia significativa de menores, no es un
                vehículo adecuado para campañas iGaming. En SocialPro realizamos un análisis
                demográfico de la audiencia de cada creador antes de su activación —edad media,
                distribución por grupos de edad según datos de plataforma— y documentamos este
                análisis en el expediente de campaña. Adicionalmente, el creador no puede realizar
                integraciones de iGaming en contenido dirigido específicamente a audiencias
                infantiles o adolescentes, independientemente de la composición general de su
                comunidad.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-black uppercase tracking-tight text-sp-dark mb-4">
                ¿Quién es corresponsable del contenido: el operador o el creador?
              </h2>
              <p className="text-base text-sp-muted leading-relaxed">
                Ambos. La normativa española establece que el operador es corresponsable del contenido
                publicitario generado por influencers que actúan en su nombre. Esto significa que si
                un streamer publica una integración de iGaming que no cumple con la regulación, el
                operador no puede excusar su responsabilidad alegando que &ldquo;fue decisión del creador&rdquo;.
                El operador tiene el deber de asegurarse de que sus colaboradores publicitarios
                cumplen con la normativa, lo que en la práctica equivale a tener un proceso de
                revisión y aprobación de contenido antes de su publicación. El creador, por su
                parte, asume responsabilidad respecto a su audiencia y frente a la plataforma donde
                publica. Esta doble responsabilidad es la justificación operativa de los flujos de
                revisión previa que SocialPro implementa en todas sus campañas iGaming.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-black uppercase tracking-tight text-sp-dark mb-4">
                ¿Cómo funciona el proceso de revisión de contenido antes de una integración?
              </h2>
              <p className="text-base text-sp-muted leading-relaxed">
                En SocialPro, el proceso de revisión previa de contenido iGaming tiene tres puntos
                de control. Primero, el creador recibe un briefing de integración que incluye los
                mensajes obligatorios de juego responsable, las restricciones de mensaje aprobadas
                por el operador y las formas de identificación publicitaria requeridas. Segundo, si
                el creador prepara guion o puntos clave de la integración, estos se revisan antes
                del directo por el equipo de compliance de SocialPro y se envían al operador para
                su visto bueno. Tercero, tras la publicación se verifica que el contenido publicado
                coincide con lo aprobado y se documenta en el informe de campaña. Este proceso no
                alarga materialmente el tiempo de activación: desde el brief firmado hasta el creador
                en directo, el proceso completo tarda menos de 72 horas para campañas estándar.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-black uppercase tracking-tight text-sp-dark mb-4">
                ¿Qué restricciones específicas introdujo el Real Decreto 958/2020?
              </h2>
              <p className="text-base text-sp-muted leading-relaxed">
                El Real Decreto 958/2020 de 3 de noviembre supuso un endurecimiento significativo
                de las condiciones de publicidad de juego online en España. Entre los cambios más
                relevantes para campañas con influencers se encuentran las restricciones sobre el
                uso de personajes públicos y celebridades en publicidad iGaming, nuevas condiciones
                sobre horarios y espacios publicitarios, y mayores exigencias de transparencia en
                la identificación de contenido patrocinado. Algunos de estos aspectos han sido
                objeto de interpretación y ajuste posterior. Dado que la normativa puede evolucionar,
                en SocialPro revisamos periódicamente las condiciones aplicables y adaptamos los
                briefings de compliance a la interpretación más actualizada. Para casos específicos,
                recomendamos consultar directamente con la{' '}
                <a
                  href="https://www.ordenacionjuego.es"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sp-orange hover:underline"
                >
                  DGOJ
                </a>{' '}
                o con asesor legal especializado.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-black uppercase tracking-tight text-sp-dark mb-4">
                ¿Qué diferencia hay entre el compliance iGaming en España y en LATAM?
              </h2>
              <p className="text-base text-sp-muted leading-relaxed">
                El marco regulatorio de España, gestionado por la DGOJ, es uno de los más
                estructurados de Europa para el juego online. En contraste, los países de LATAM
                tienen marcos regulatorios en distintos estadios de desarrollo. Colombia cuenta
                con Coljuegos como regulador y tiene un marco establecido. México regula a nivel
                federal y estatal, con complejidad adicional. Argentina regula por provincia. Chile
                y Perú están en proceso de regulación nacional del juego online. Esta fragmentación
                implica que una campaña que es completamente conforme en España puede no cumplir
                los requisitos locales en un mercado latinoamericano concreto. En SocialPro
                adaptamos el briefing de compliance y la selección de creadores a la normativa
                aplicable en cada mercado antes de activar cualquier campaña transfronteriza.
              </p>
            </section>

          </div>

          {/* FAQ block */}
          <div className="mt-16 pt-12 border-t border-sp-border">
            <h2 className="font-display text-2xl font-black uppercase tracking-tight text-sp-dark mb-8">
              Preguntas frecuentes sobre compliance DGOJ
            </h2>
            <div className="space-y-8">
              {FAQ_ITEMS.map((item) => (
                <div key={item.q} className="border-b border-sp-border pb-8">
                  <h3 className="font-bold text-sp-dark mb-3">{item.q}</h3>
                  <p className="text-sm text-sp-muted leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Related links */}
          <div className="mt-12 pt-8 border-t border-sp-border">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sp-muted mb-3">Recursos relacionados</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/servicios/igaming" className="text-xs font-semibold text-sp-muted hover:text-sp-orange border border-sp-border hover:border-sp-orange rounded-full px-3 py-1.5 transition-colors">
                Campañas iGaming con SocialPro
              </Link>
              <Link href="/casos/onewin" className="text-xs font-semibold text-sp-muted hover:text-sp-orange border border-sp-border hover:border-sp-orange rounded-full px-3 py-1.5 transition-colors">
                Caso 1WIN — 340+ FTDs verificados
              </Link>
              <a href="https://www.ordenacionjuego.es" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-sp-muted hover:text-sp-orange border border-sp-border hover:border-sp-orange rounded-full px-3 py-1.5 transition-colors">
                DGOJ — ordenacionjuego.es ↗
              </a>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 rounded-2xl bg-sp-off border border-sp-border p-8 text-center">
            <p className="font-display text-xl font-black uppercase text-sp-dark mb-2">
              ¿Quieres activar una campaña iGaming con compliance integrado?
            </p>
            <p className="text-sm text-sp-muted mb-6 max-w-xl mx-auto">
              SocialPro gestiona el proceso completo: vetting de creadores, briefing legal, revisión
              de contenido y FTD tracking verificado. Cuéntanos tu proyecto.
            </p>
            <TrackedCtaLink
              href="/contacto"
              ctaId="dgoj_guide_cta"
              className="inline-block bg-sp-grad text-white font-display font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full hover:opacity-90 transition-opacity"
            >
              Solicitar propuesta iGaming
            </TrackedCtaLink>
          </div>

        </div>
      </article>
    </>
  );
}
