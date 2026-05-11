import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';
import { ContactSection } from '@/features/contact/components/ContactSection';
import { absoluteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  title: 'Contacta con Nuestra Agencia Gaming',
  description:
    '¿Buscas streamers para tu campaña gaming o iGaming? Cuéntanos tu proyecto. Respondemos en menos de 24h. Sin compromiso.',
  alternates: {
    canonical: '/contacto',
  },
  openGraph: {
    title: 'Contacta con Nuestra Agencia Gaming | SocialPro',
    description:
      '¿Buscas streamers para tu campaña gaming o iGaming? Cuéntanos tu proyecto. Respondemos en menos de 24h.',
    url: absoluteUrl('/contacto'),
    images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contacta con Nuestra Agencia Gaming | SocialPro',
    description:
      '¿Buscas streamers para tu campaña gaming o iGaming? Respondemos en menos de 24h. Sin compromiso.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  '@id': absoluteUrl('/contacto'),
  name: 'Contacta con Nuestra Agencia Gaming',
  description: '¿Buscas streamers para tu campaña gaming o iGaming? Cuéntanos tu proyecto. Respondemos en menos de 24h.',
  url: absoluteUrl('/contacto'),
  inLanguage: 'es',
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Contacto', item: absoluteUrl('/contacto') },
    ],
  },
  mainEntity: { '@type': 'Organization', '@id': absoluteUrl('/#organization') },
};

export default function ContactoPage() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <h1 className="sr-only">Contacta con Nuestra Agencia Gaming</h1>
      <ContactSection />
    </div>
  );
}
