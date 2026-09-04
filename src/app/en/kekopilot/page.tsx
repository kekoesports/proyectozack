import type { Metadata, Viewport } from 'next';
import { KekoPilotExperience } from '@/features/kekopilot/components/KekoPilotExperience';
import { kekopilotUrl } from '@/lib/kekopilot-url';

export const metadata: Metadata = {
  title: { absolute: 'KekoPilot — Your operations, under control' },
  description: 'Bring email, Discord, documents, deals and invoices into one operating system with specialised agents and human approval.',
  manifest: '/kekopilot.webmanifest',
  icons: {
    icon: [{ url: '/kekopilot/icon.svg', type: 'image/svg+xml' }],
  },
  alternates: {
    canonical: kekopilotUrl('/en'),
    languages: {
      es: kekopilotUrl('/'),
      en: kekopilotUrl('/en'),
    },
  },
  openGraph: {
    title: 'KekoPilot — Your operations, under control',
    description: 'An operating system for teams with specialised agents and human approval.',
    url: kekopilotUrl('/en'),
    siteName: 'KekoPilot',
    locale: 'en_US',
    type: 'website',
    images: [{ url: kekopilotUrl('/kekopilot-og.png'), width: 1200, height: 630, alt: 'KekoPilot operations control diagram.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KekoPilot — Your operations, under control',
    description: 'Operating system for operations teams with specialised AI agents.',
    images: [kekopilotUrl('/kekopilot-og.png')],
  },
};

export const viewport: Viewport = { themeColor: '#f3f2f2' };

export default function KekoPilotEnglishPage() {
  return <KekoPilotExperience locale="en" />;
}
