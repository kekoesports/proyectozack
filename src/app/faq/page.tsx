import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';
import { absoluteUrl, SITE_URL } from '@/lib/site-url';
import { FaqClient } from './FaqClient';

export const metadata: Metadata = {
  title: 'Preguntas Frecuentes — Códigos, Sorteos y SocialPro',
  description:
    'Resuelve tus dudas sobre los códigos de descuento, sorteos de skins, marcas y cómo funciona SocialPro. Respuestas claras en menos de 2 minutos.',
  alternates: { canonical: '/faq' },
  openGraph: {
    title: 'FAQ — Preguntas Frecuentes | SocialPro',
    description: 'Todo lo que necesitas saber sobre códigos, sorteos y cómo funciona SocialPro.',
    url: absoluteUrl('/faq'),
    images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630 }],
  },
};

export const FAQ_ITEMS = [
  // ── Sobre los códigos ──────────────────────────────────────────────
  {
    category: 'Códigos',
    q: '¿Qué son los códigos de SocialPro?',
    a: 'Son códigos de referido o descuento que nuestros creadores comparten con su comunidad. Al usarlos en plataformas como Keydrop, Skinplace, SkinsMonkey o Hellcase consigues un bono de bienvenida, créditos extra o descuento en tus depósitos. El creador recibe una pequeña comisión sin coste adicional para ti.',
  },
  {
    category: 'Códigos',
    q: '¿Cómo se usa un código?',
    a: 'En la página del creador o en /giveaways encontrarás el código y un botón "Usar código". Al hacer clic te redirige a la plataforma correspondiente con el código ya aplicado (o una instrucción clara de dónde pegarlo durante el registro o el primer depósito).',
  },
  {
    category: 'Códigos',
    q: '¿Los códigos caducan?',
    a: 'Depende de la campaña. Los códigos sin fecha de fin son indefinidos. Los que tienen fecha aparecen marcados como "Activo hasta [fecha]". Si el código ya no funciona, ponte en contacto con el creador o con nosotros en marketing@socialpro.es.',
  },
  {
    category: 'Códigos',
    q: '¿Puedo usar varios códigos a la vez?',
    a: 'Cada plataforma tiene sus propias reglas. En general, el código de referido se aplica una sola vez al crear la cuenta o al primer depósito. No es posible acumular varios códigos de distintos creadores en la misma cuenta.',
  },
  {
    category: 'Códigos',
    q: '¿Los códigos son exclusivos de SocialPro?',
    a: 'Los códigos que publicamos son los que nuestros creadores gestionan activamente con SocialPro. En ocasiones ofrecen bonos superiores a los disponibles en otras fuentes, porque son acuerdos negociados directamente entre SocialPro y la marca.',
  },
  // ── Sobre los sorteos ──────────────────────────────────────────────
  {
    category: 'Sorteos',
    q: '¿Cómo participo en un sorteo?',
    a: 'Haz clic en "Participar en el sorteo" dentro del perfil del creador o en /sorteos. Serás redirigido a la plataforma oficial del sorteo (Keydrop, Skinplace, etc.) donde se gestionan las participaciones. SocialPro no recoge datos personales directamente en los sorteos.',
  },
  {
    category: 'Sorteos',
    q: '¿Cuándo se anuncian los ganadores?',
    a: 'Los ganadores se anuncian en el canal del creador (Twitch, YouTube o Instagram) al finalizar el sorteo. Algunos creadores también los publican en /talentos/[slug] bajo la sección "Últimos ganadores". La fecha de fin aparece como cuenta atrás en cada card de sorteo.',
  },
  {
    category: 'Sorteos',
    q: '¿Cómo recibo mi premio si gano?',
    a: 'El creador o la plataforma del sorteo (Keydrop, SkinsMonkey, etc.) se pone en contacto contigo a través del método indicado en las bases del sorteo: normalmente por DM en Twitch, Discord o correo. SocialPro no gestiona la entrega de premios directamente.',
  },
  {
    category: 'Sorteos',
    q: '¿Tengo que pagar algo para participar?',
    a: 'No. Los sorteos que aparecen en SocialPro son gratuitos para el espectador. El creador y/o la marca patrocinan el premio. Algunos sorteos requieren que estés registrado en la plataforma, pero el registro en sí es gratuito.',
  },
  {
    category: 'Sorteos',
    q: '¿Los sorteos son reales?',
    a: 'Sí. Trabajamos exclusivamente con plataformas verificadas (Keydrop, Skinplace, SkinsMonkey, Hellcase) que publican sus resultados de forma transparente. En la sección de ganadores de cada creador puedes ver premios anteriores con fecha y nickname del ganador.',
  },
  // ── Sobre las marcas ──────────────────────────────────────────────
  {
    category: 'Marcas',
    q: '¿Es seguro Keydrop, Hellcase, Skinplace o SkinsMonkey?',
    a: 'Son plataformas de skins de CS2 con años de operación y comunidades grandes. Como con cualquier plataforma de este tipo, recomendamos leer sus términos, jugar con responsabilidad y no gastar más de lo que puedas permitirte. Si tienes dudas, consulta las reseñas independientes en Trustpilot o Reddit antes de depositar.',
  },
  {
    category: 'Marcas',
    q: '¿Qué diferencia hay entre las plataformas?',
    a: 'Keydrop y Hellcase se especializan en apertura de cajas de CS2. Skinplace es un marketplace de compra-venta de skins. SkinsMonkey ofrece intercambio (trade) de skins peer-to-peer. Cada una tiene su propio catálogo de bonos de bienvenida accesibles con los códigos de nuestros creadores.',
  },
  {
    category: 'Marcas',
    q: '¿Por qué SocialPro colabora con marcas de iGaming?',
    a: 'Las plataformas de skins de CS2 son parte del ecosistema gaming hispano. Nuestros creadores tienen audiencias adultas familiarizadas con este tipo de productos. Todas las campañas se realizan con compliance regulatorio integrado y mensajes de juego responsable según la normativa aplicable.',
  },
  // ── Sobre SocialPro ──────────────────────────────────────────────
  {
    category: 'SocialPro',
    q: '¿Qué es SocialPro?',
    a: 'SocialPro es una agencia de talentos gaming fundada en 2012 en Madrid. Gestionamos la carrera y las campañas de streamers y creadores de contenido hispanohablantes especializados en CS2, iGaming y gaming en general. Conectamos marcas con creadores y nos encargamos de todo el proceso: selección, compliance, tracking y reporting.',
  },
  {
    category: 'SocialPro',
    q: '¿Cómo trabajáis con los creadores?',
    a: 'Nuestros creadores son parte del roster de SocialPro. Gestionamos sus deals con marcas, les asesoramos sobre compliance regulatorio y optimizamos sus campañas con datos reales. Los códigos y sorteos que ves en la web son parte de sus acuerdos activos con marcas verificadas.',
  },
  {
    category: 'SocialPro',
    q: 'Soy creador, ¿cómo me uno a SocialPro?',
    a: 'Puedes aplicar a través de /para-creadores o escribirnos a marketing@socialpro.es. Trabajamos con creadores de todas las audiencias, desde canales emergentes hasta grandes streamers, siempre que encajen con las verticales de gaming o iGaming y tengan una comunidad activa.',
  },
  {
    category: 'SocialPro',
    q: 'Soy una marca, ¿cómo trabajamos juntos?',
    a: 'Puedes contactarnos en /contacto o directamente en marketing@socialpro.es. Respondemos con una propuesta en menos de 48 horas. Ofrecemos desde activaciones puntuales (72h de plazo) hasta campañas multistreamer a largo plazo con FTD tracking y reporting auditable por tu equipo de affiliate.',
  },
] as const;

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': absoluteUrl('/faq'),
  mainEntity: FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Preguntas frecuentes', item: absoluteUrl('/faq') },
  ],
};

export default function FaqPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />
      <main className="bg-sp-black text-white min-h-screen">
        <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-sp-orange mb-4">Ayuda</p>
          <h1 className="font-display text-4xl sm:text-5xl font-black uppercase leading-tight mb-3">
            Preguntas frecuentes
          </h1>
          <p className="text-sp-muted2 text-base mb-10">
            Todo lo que necesitas saber sobre códigos, sorteos y cómo funciona SocialPro.
          </p>
          <FaqClient items={FAQ_ITEMS} />
        </section>
      </main>
    </>
  );
}
