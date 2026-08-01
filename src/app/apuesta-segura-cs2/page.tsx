import type { Metadata } from 'next';

import { absoluteUrl } from '@/lib/site-url';

import { Hero } from './_components/Hero';
import { CoverageMarquee } from './_components/CoverageMarquee';
import { TrustBlock } from './_components/TrustBlock';
import { HowWeWork } from './_components/HowWeWork';
import { TelegramSection } from './_components/TelegramSection';
import { OfficialChannelStamp } from './_components/OfficialChannelStamp';
import { BlogabetValidation } from './_components/BlogabetValidation';
import { MonthlyResults } from './_components/MonthlyResults';
import { Faq } from './_components/Faq';
import { FinalCta } from './_components/FinalCta';

export const metadata: Metadata = {
  title: 'Apuesta Segura CS2 — Análisis competitivo por ArkeroZ',
  description:
    'Pronósticos de CS2 tier 2-3 (ESEA Advanced, CCT, Exort Series) por ArkeroZ. Picks diarios en abierto, comunidad gratuita en Telegram y trazabilidad Blogabet verificable.',
  alternates: { canonical: '/apuesta-segura-cs2' },
  openGraph: {
    title: 'Apuesta Segura CS2 — Análisis competitivo por ArkeroZ',
    description:
      'Picks de CS2 tier 2-3 diarios en abierto. Telegram gratuito y trazabilidad verificable en Blogabet.',
    url: absoluteUrl('/apuesta-segura-cs2'),
    siteName: 'SocialPro',
    locale: 'es_ES',
    type: 'website',
    images: [{
      url: absoluteUrl('/og-socialpro.png'),
      width: 1200,
      height: 630,
      alt: 'Apuesta Segura CS2 · Análisis competitivo por ArkeroZ',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Apuesta Segura CS2 — Análisis competitivo por ArkeroZ',
    description:
      'Picks de CS2 tier 2-3 diarios. Telegram gratuito y trazabilidad Blogabet.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

export default function ApuestaSeguraCs2Page() {
  return (
    <>
      <Hero />
      <CoverageMarquee />
      <TrustBlock />
      <HowWeWork />
      <TelegramSection />
      <OfficialChannelStamp />
      <BlogabetValidation />
      <MonthlyResults />
      <Faq />
      <FinalCta />
    </>
  );
}
