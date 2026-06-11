import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';
import { ContactSection } from '@/features/contact/components/ContactSection';
import { absoluteUrl } from '@/lib/site-url';
import type { ContactForm } from '@/features/contact/components/ContactSection.parts';

export const metadata: Metadata = {
  title: 'Contacta con Nuestra Agencia Gaming',
  description:
    '¿Buscas streamers para tu campaña gaming o iGaming? Cuéntanos tu proyecto. Respondemos en menos de 24h. Sin compromiso.',
  alternates: {
    canonical: '/contacto',
    languages: {
      es: absoluteUrl('/contacto'),
      en: absoluteUrl('/contact'),
      'x-default': absoluteUrl('/contacto'),
    },
  },
  openGraph: {
    title: 'Contacta con Nuestra Agencia Gaming | SocialPro',
    description:
      '¿Buscas streamers para tu campaña gaming o iGaming? Cuéntanos tu proyecto. Respondemos en menos de 24h.',
    url: absoluteUrl('/contacto'),
    images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630, alt: 'Contacta con SocialPro — Agencia Gaming e iGaming' }],
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

export default async function ContactoPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const talentName = params.talent;
  const typeParam  = params.type;

  const resolvedType = typeParam === 'brand' ? ('brand' as const) : typeParam === 'talent' ? ('talent' as const) : null;
  const defaultValues: Partial<ContactForm> | undefined = (talentName ?? resolvedType)
    ? {
        ...(resolvedType ? { type: resolvedType } : {}),
        ...(talentName ? { message: `Hola, me interesa colaborar con ${talentName}.` } : {}),
      }
    : undefined;

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <h1 className="sr-only">Contacta con Nuestra Agencia Gaming</h1>
      {defaultValues ? <ContactSection defaultValues={defaultValues} /> : <ContactSection />}
    </div>
  );
}
