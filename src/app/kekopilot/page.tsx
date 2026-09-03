import type { Metadata, Viewport } from 'next';
import { KekoPilotExperience } from '@/features/kekopilot/components/KekoPilotExperience';
import { absoluteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  title: { absolute: 'KekoPilot — Sistema operativo para equipos de operaciones' },
  description: 'Centraliza acuerdos, documentos, tareas y facturación con agentes de IA especializados y aprobación humana.',
  alternates: {
    canonical: absoluteUrl('/kekopilot'),
    languages: {
      es: absoluteUrl('/kekopilot'),
      en: absoluteUrl('/en/kekopilot'),
    },
  },
  openGraph: {
    title: 'KekoPilot — Tu operación avanza. Tú decides.',
    description: 'Un sistema operativo para equipos de operaciones con agentes especializados y aprobación humana.',
    url: absoluteUrl('/kekopilot'),
    siteName: 'KekoPilot',
    locale: 'es_ES',
    type: 'website',
    images: [{ url: absoluteUrl('/kekopilot-og.png'), width: 1200, height: 630, alt: 'KekoPilot — Tu operación avanza. Tú decides.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KekoPilot — Tu operación avanza. Tú decides.',
    description: 'Sistema operativo para equipos de operaciones con agentes de IA especializados.',
    images: [absoluteUrl('/kekopilot-og.png')],
  },
};

export const viewport: Viewport = { themeColor: '#0b1113' };

export default function KekoPilotPage() {
  return <KekoPilotExperience locale="es" />;
}
