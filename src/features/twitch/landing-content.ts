import type { Metadata } from 'next';
import type { Locale } from '@/lib/locale';
import { absoluteUrl } from '@/lib/site-url';

export const TWITCH_PATHS = { en: '/twitch-streamers-agency', es: '/agencia-streamers-twitch' } as const;
export const TWITCH_LANGUAGES = {
  en: absoluteUrl(TWITCH_PATHS.en), es: absoluteUrl(TWITCH_PATHS.es),
  'x-default': absoluteUrl(TWITCH_PATHS.es),
};

export const TWITCH_COPY = {
  en: {
    title: 'Twitch Streamers Agency in Spain & LATAM | SocialPro',
    description: 'Launch Twitch influencer campaigns in Spain and Latin America with verified gaming streamers, campaign management and measurable reporting.',
    h1: 'Twitch Streamers Agency for Spain & LATAM',
    subtitle: 'Live. Trusted. Measured.',
    intro: 'Live gaming influencer marketing with Twitch streamers across Spain and LatAm. Meet our creators, explore a published brand collaboration and request a shortlist for your campaign.',
    heroCta: 'Activate Twitch campaign',
    advantagesLabel: 'The Twitch difference', advantagesTitle: 'Build a campaign around the live experience.',
    advantages: [
      { title: 'Sustained brand exposure', desc: 'A live session gives your brand room to appear in context: product demonstrations, sponsored segments and on-screen visibility agreed in the brief.' },
      { title: 'Established creator communities', desc: 'Choose streamers whose content and community fit your brand. Clear sponsorship disclosure helps viewers understand the collaboration.' },
      { title: 'Real-time interaction with your audience', desc: 'Viewers can ask questions and react to a product during the stream. We agree on the relevant engagement signals before the campaign.' },
      { title: 'Live events and activations', desc: 'Tournaments, product launches and interactive campaigns can bring creators and audiences together. We plan the format, production and schedule around your objective.' },
    ],
    formatsLabel: 'What we activate', formatsTitle: 'Twitch campaign formats',
    formats: [
      { title: 'Sponsored stream sessions', desc: 'Branded segments integrated naturally into a live stream. Product mentions, on-screen overlays and interactive chat moments.' },
      { title: 'Twitch tournaments', desc: 'Custom tournaments with your brand as presenting sponsor. Production, visuals and an audience plan agreed in the brief.' },
      { title: 'Product launch streams', desc: 'Exclusive live reveals with pre-selected streamers. Real-time audience reactions and conversion tracking agreed for the campaign.' },
    ],
    faqTitle: 'Planning your Twitch campaign',
    faqs: [
      { question: 'Which Twitch creators can I work with?', answer: 'Browse a selection of our public roster below. Share your target country, audience and campaign objective so we can confirm creator fit and availability before preparing a shortlist.' },
      { question: 'What does a Twitch campaign include?', answer: 'The brief defines the creators, sponsored segments, overlays, schedule and reporting. We agree on deliverables and measurement before activation; results depend on the audience, creative and campaign.' },
      { question: 'Do you work with brands in Spain and Latin America?', answer: 'Yes. SocialPro connects brands with gaming creators in Spain and Latin America. Tell us the countries and language you need to reach so the proposal matches your market.' },
    ],
    relatedIntro: 'Explore our related services for esports activations and game-specific campaigns:',
    related: [{ href: '/esports-marketing-agency', label: 'Esports marketing activations' }, { href: '/valorant-influencers-agency', label: 'Valorant influencers agency' }, { href: '/cs2-influencer-marketing', label: 'CS2 influencer marketing service' }],
    finalTitle: 'Your brand. Live on Twitch.',
    finalText: 'Tell us your brand, target audience and campaign goal. We confirm creator availability and prepare a proposal around your brief.',
    proposal: 'Get a proposal', roster: 'View our streamers →',
  },
  es: {
    title: 'Agencia de streamers de Twitch en España y LATAM | SocialPro',
    description: 'Activa campañas de influencer marketing en Twitch con streamers gaming verificados de España y LATAM. Selección, producción, tracking y reporting.',
    h1: 'Agencia de streamers de Twitch para marcas',
    subtitle: 'En directo. Con confianza. Con medición.',
    intro: 'Campañas de influencer marketing con streamers de Twitch de España y Latinoamérica. Conoce a nuestros creadores, consulta una colaboración publicada y solicita una selección adaptada a tu marca.',
    heroCta: 'Planificar una campaña en Twitch',
    advantagesLabel: 'El valor del directo', advantagesTitle: 'Una campaña pensada para la experiencia en Twitch.',
    advantages: [
      { title: 'Presencia de marca en contexto', desc: 'Un directo permite mostrar el producto en uso, integrar segmentos patrocinados y acordar la presencia de marca en pantalla según el briefing.' },
      { title: 'Comunidades con una relación previa', desc: 'Seleccionamos streamers cuyo contenido y comunidad encajan con tu marca. Identificar claramente el patrocinio ayuda a la audiencia a entender la colaboración.' },
      { title: 'Interacción en tiempo real', desc: 'La audiencia puede preguntar y reaccionar al producto durante el directo. Acordamos qué señales de interacción se medirán antes de empezar.' },
      { title: 'Eventos y activaciones en directo', desc: 'Torneos, lanzamientos y campañas participativas conectan a creadores y audiencia. Definimos el formato, la producción y el calendario según tus objetivos.' },
    ],
    formatsLabel: 'Qué podemos activar', formatsTitle: 'Formatos de campaña en Twitch',
    formats: [
      { title: 'Directos patrocinados', desc: 'Segmentos de marca integrados en el contenido: menciones de producto, overlays y momentos de interacción con el chat.' },
      { title: 'Torneos en Twitch', desc: 'Torneos a medida con tu marca como patrocinadora. Producción, identidad visual y plan de audiencia acordados en el briefing.' },
      { title: 'Lanzamientos de producto', desc: 'Presentaciones en directo con streamers seleccionados. Reacciones de la audiencia y seguimiento de conversiones según el plan de campaña.' },
    ],
    faqTitle: 'Prepara tu campaña en Twitch',
    faqs: [
      { question: '¿Con qué creadores de Twitch puedo trabajar?', answer: 'Consulta una selección de nuestro roster público. Indícanos el país, la audiencia y el objetivo de campaña para confirmar el encaje y la disponibilidad de cada creador antes de preparar una propuesta.' },
      { question: '¿Qué incluye una campaña en Twitch?', answer: 'El briefing define los creadores, segmentos patrocinados, overlays, calendario e informes. Acordamos entregables y medición antes de la activación; los resultados dependen de la audiencia, la creatividad y la campaña.' },
      { question: '¿Trabajáis con marcas en España y Latinoamérica?', answer: 'Sí. SocialPro conecta marcas con creadores gaming de España y Latinoamérica. Cuéntanos a qué países y en qué idioma quieres llegar para adaptar la propuesta a tu mercado.' },
    ],
    relatedIntro: 'También puedes consultar nuestros servicios para esports y campañas por videojuego:',
    related: [{ href: '/agencia-marketing-esports', label: 'Marketing de esports para marcas' }, { href: '/agencia-influencers-valorant', label: 'Campañas con influencers de Valorant' }, { href: '/influencers-cs2', label: 'Influencer marketing de CS2' }],
    finalTitle: 'Tu marca, en directo en Twitch.',
    finalText: 'Cuéntanos tu marca, público objetivo y meta de campaña. Confirmamos la disponibilidad de los creadores y preparamos una propuesta a partir de tu briefing.',
    proposal: 'Solicitar una propuesta', roster: 'Ver nuestros streamers →',
  },
};

export function twitchMetadata(locale: Locale): Metadata {
  const { title, description } = TWITCH_COPY[locale];
  const url = absoluteUrl(TWITCH_PATHS[locale]);
  return {
    title: { absolute: title }, description,
    alternates: { canonical: url, languages: TWITCH_LANGUAGES },
    openGraph: { title, description, url, type: 'website', locale: locale === 'es' ? 'es_ES' : 'en_US', images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', title, description, images: [absoluteUrl('/og-socialpro.png')] },
  };
}
