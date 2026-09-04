import type { Metadata, Viewport } from 'next';
import { KekoPilotExperience } from '@/features/kekopilot/components/KekoPilotExperience';
import { kekopilotUrl } from '@/lib/kekopilot-url';

export const metadata: Metadata = {
  title: { absolute: 'KekoPilot — Tus operaciones, bajo control' },
  description: 'Reúne email, Discord, documentos, acuerdos y facturas en un sistema operativo con agentes especializados y aprobación humana.',
  manifest: '/kekopilot.webmanifest',
  icons: {
    icon: [{ url: '/kekopilot/icon.svg', type: 'image/svg+xml' }],
  },
  alternates: {
    canonical: kekopilotUrl('/'),
    languages: {
      es: kekopilotUrl('/'),
      en: kekopilotUrl('/en'),
    },
  },
  openGraph: {
    title: 'KekoPilot — Tus operaciones, bajo control',
    description: 'Un sistema operativo para equipos con agentes especializados y aprobación humana.',
    url: kekopilotUrl('/'),
    siteName: 'KekoPilot',
    locale: 'es_ES',
    type: 'website',
    images: [{ url: kekopilotUrl('/kekopilot-og.png'), width: 1200, height: 630, alt: 'KekoPilot — Tus operaciones, bajo control.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KekoPilot — Tus operaciones, bajo control',
    description: 'Sistema operativo para equipos de operaciones con agentes de IA especializados.',
    images: [kekopilotUrl('/kekopilot-og.png')],
  },
};

export const viewport: Viewport = { themeColor: '#f3f2f2' };

export default function KekoPilotPage() {
  return <KekoPilotExperience locale="es" />;
}
