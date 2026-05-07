import type { Metadata } from 'next';

import { absoluteUrl } from '@/lib/site-url';
import { ContactFormEn } from '@/features/contact/components/ContactFormEn';

export const metadata: Metadata = {
  title: 'Contact Our Gaming Marketing Agency',
  description:
    'Looking for streamers for your gaming or iGaming campaign? Tell us about your project. We reply within 24 hours. No commitment.',
  alternates: {
    canonical: '/contact',
    languages: {
      en: absoluteUrl('/contact'),
      es: absoluteUrl('/contacto'),
      'x-default': absoluteUrl('/contact'),
    },
  },
  openGraph: {
    title: 'Contact Our Gaming Marketing Agency | SocialPro',
    description: 'Looking for streamers for your gaming or iGaming campaign? We reply within 24 hours.',
    url: absoluteUrl('/contact'),
    images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Our Gaming Marketing Agency | SocialPro',
    description: 'Looking for streamers for your gaming or iGaming campaign? Reply within 24h.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

const g = {
  background: 'linear-gradient(135deg,#f5632a 0%,#e03070 35%,#c42880 62%,#8b3aad 100%)',
  WebkitBackgroundClip: 'text' as const,
  WebkitTextFillColor: 'transparent' as const,
  backgroundClip: 'text' as const,
};

export default function ContactEnPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-sp-black pt-32 pb-12 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-sp-orange text-xs font-bold uppercase tracking-[0.2em] mb-4">Contact</p>
          <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-tight mb-6">
            Let’s talk <span style={g}>today</span>
          </h1>
          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mx-auto">
            Tell us about your campaign. We reply within 24 hours with a tailored proposal.
            No commitment — just a clear conversation.
          </p>
        </div>
      </section>

      <ContactFormEn />
    </>
  );
}
