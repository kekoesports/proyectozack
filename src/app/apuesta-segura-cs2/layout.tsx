import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { absoluteUrl } from '@/lib/site-url';
import { StickyCtaMobile } from '@/components/ui/StickyCtaMobile';
import { AttributionCapture } from './_components/AttributionCapture';
import { FloatingTelegramCta } from './_components/FloatingTelegramCta';
import { BLOGABET_URL, TELEGRAM_URL } from './_components/tokens';

export const metadata: Metadata = {
  title:
    'Apuesta Segura CS2 | Análisis competitivo y picks verificadas | SocialPro',
  description:
    'Análisis competitivo de Counter-Strike 2 por ArkeroZ — ESEA Main, Advanced y tier europeo. Canal de Telegram gratuito, picks verificadas en Blogabet. Un proyecto del ecosistema SocialPro.',
  alternates: {
    canonical: '/apuesta-segura-cs2',
  },
  openGraph: {
    title: 'Apuesta Segura CS2 | Análisis competitivo · SocialPro',
    description:
      'Picks de CS2 verificadas en Blogabet por ArkeroZ. Telegram gratuito · ESEA Main, Advanced y tier europeo. Un proyecto SocialPro.',
    url: absoluteUrl('/apuesta-segura-cs2'),
    type: 'website',
    locale: 'es_ES',
    images: [
      {
        url: absoluteUrl('/og-socialpro.png'),
        width: 1200,
        height: 630,
        alt: 'Apuesta Segura CS2 — Análisis competitivo · SocialPro',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Apuesta Segura CS2 | SocialPro',
    description:
      'Picks CS2 verificadas en Blogabet por ArkeroZ. Telegram gratuito · ESEA Main, Advanced y tier europeo.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': absoluteUrl('/apuesta-segura-cs2#webpage'),
      url: absoluteUrl('/apuesta-segura-cs2'),
      name: 'Apuesta Segura CS2 | SocialPro',
      isPartOf: { '@id': absoluteUrl('/#website') },
      about: { '@id': absoluteUrl('/#organization') },
      inLanguage: 'es',
      description:
        'Análisis competitivo y predicciones verificadas de Counter-Strike 2 por ArkeroZ. Proyecto del ecosistema SocialPro.',
    },
    {
      '@type': 'Person',
      '@id': absoluteUrl('/apuesta-segura-cs2#tipster'),
      name: 'ArkeroZ',
      jobTitle: 'CS2 Analyst · Esports tipster',
      description:
        'Más de 5 años analizando el ecosistema competitivo de Counter-Strike 2 — ESEA Main, ESEA Advanced y tier 2-3 europeo.',
      url: BLOGABET_URL,
      sameAs: [BLOGABET_URL],
      worksFor: { '@id': absoluteUrl('/#organization') },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: '¿Qué tipo de competiciones analizamos?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Especialización en el ecosistema europeo de CS2 — ESEA Main, ESEA Advanced, CCT Europe y otras competiciones tier 2 y tier 3, además de tier 1 cuando hay valor real frente a la cuota.',
          },
        },
        {
          '@type': 'Question',
          name: '¿Cómo se publican los resultados?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Cada pick se publica en abierto en Blogabet antes del inicio del partido. El histórico es público y verificable.',
          },
        },
        {
          '@type': 'Question',
          name: '¿Qué es Blogabet?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Blogabet es una plataforma independiente de tracking de tipsters que verifica picks, calcula yield y ROI y publica el histórico.',
          },
        },
        {
          '@type': 'Question',
          name: '¿El acceso al canal es gratuito?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sí. El canal de Telegram es 100% gratuito, sin VIPs de pago.',
          },
        },
        {
          '@type': 'Question',
          name: '¿Se muestran estadísticas reales?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Las estadísticas están sincronizadas con el histórico público de Blogabet y se calculan sobre los picks publicados.',
          },
        },
        {
          '@type': 'Question',
          name: '¿Qué tipo de apuestas se realizan?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Match winners, hándicaps de mapas, totales de rondas y mercados específicos cuando hay value. Stakes calibrados según convicción.',
          },
        },
        {
          '@type': 'Question',
          name: '¿Qué relación tiene con SocialPro?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Apuesta Segura CS2 es un proyecto del ecosistema SocialPro, agencia gaming y esports fundada en Madrid en 2012.',
          },
        },
      ],
    },
  ],
} satisfies Record<string, unknown>;

export default function ApuestaSeguraCs2Layout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AttributionCapture />
      {children}
      <FloatingTelegramCta />
      <StickyCtaMobile
        href={TELEGRAM_URL}
        label="Entrar al Telegram CS2"
        ctaId="apuesta_cs2_sticky_telegram"
        external
      />
    </>
  );
}
