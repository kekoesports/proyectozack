import type { Metadata } from 'next';
import { ServicesSection } from '@/features/marketing-site/components/ServicesSection';
import { absoluteUrl, SITE_URL } from '@/lib/site-url';

export const metadata: Metadata = {
  title: 'Agencia Marketing Gaming e iGaming',
  description:
    'Campañas de influencer marketing gaming, gestión de talentos streamers y canales YouTube. Especialistas en iGaming y esports para el mercado hispano.',
  alternates: {
    canonical: '/servicios',
  },
  openGraph: {
    title: 'Agencia Marketing Gaming e iGaming | SocialPro',
    description:
      'Campañas de influencer marketing gaming, gestión de talentos streamers y canales YouTube. Especialistas en iGaming y esports.',
    url: absoluteUrl('/servicios'),
    images: [{ url: absoluteUrl('/og-default.jpg'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agencia Marketing Gaming e iGaming | SocialPro',
    description:
      'Campañas de influencer marketing gaming, gestión de talentos y canales YouTube. Especialistas en iGaming.',
    images: [absoluteUrl('/og-default.jpg')],
  },
};

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Servicios de SocialPro',
  inLanguage: 'es',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      item: {
        '@type': 'Service',
        name: 'Gestión de Talentos Gaming',
        description:
          'Representación y gestión integral de streamers y creadores de contenido gaming en España y LatAm.',
        provider: { '@type': 'Organization', name: 'SocialPro', url: SITE_URL },
        url: absoluteUrl('/servicios'),
        inLanguage: 'es',
      },
    },
    {
      '@type': 'ListItem',
      position: 2,
      item: {
        '@type': 'Service',
        name: 'Campañas para Marcas iGaming',
        description:
          'Diseño y ejecución de campañas de influencer marketing iGaming con compliance integrado y FTD tracking.',
        provider: { '@type': 'Organization', name: 'SocialPro', url: SITE_URL },
        url: absoluteUrl('/servicios/igaming'),
        inLanguage: 'es',
      },
    },
    {
      '@type': 'ListItem',
      position: 3,
      item: {
        '@type': 'Service',
        name: 'Gestión de Canales YouTube',
        description:
          'Gestión editorial, producción y crecimiento de canales YouTube para creadores gaming.',
        provider: { '@type': 'Organization', name: 'SocialPro', url: SITE_URL },
        url: absoluteUrl('/servicios'),
        inLanguage: 'es',
      },
    },
  ],
};

export default function ServiciosPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <div>
        <h1 className="sr-only">Agencia Marketing Gaming e iGaming</h1>
        <ServicesSection />
      </div>
    </>
  );
}
