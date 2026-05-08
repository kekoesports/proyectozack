import type { Metadata } from 'next';
import Link from 'next/link';
import { ServicesSection } from '@/features/marketing-site/components/ServicesSection';
import { absoluteUrl, SITE_URL } from '@/lib/site-url';
import { buildBreadcrumbJsonLd } from '@/lib/utils/breadcrumbs';

export const metadata: Metadata = {
  title: 'Agencia Marketing Gaming e iGaming',
  description:
    'Contrata streamers de CS2, Valorant e iGaming verificados en España y LatAm. +15 creadores, activación en <72h, FTD tracking incluido. Solicita propuesta.',
  alternates: {
    canonical: '/servicios',
  },
  openGraph: {
    title: 'Agencia Marketing Gaming e iGaming | SocialPro',
    description:
      'Contrata streamers de CS2, Valorant e iGaming en España y LatAm. +15 creadores verificados, activación en <72h, FTD tracking incluido.',
    url: absoluteUrl('/servicios'),
    images: [{ url: absoluteUrl('/og-socialpro.png'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agencia Marketing Gaming e iGaming | SocialPro',
    description:
      'Streamers de CS2, Valorant e iGaming en España y LatAm. Activación en <72h, compliance incluido.',
    images: [absoluteUrl('/og-socialpro.png')],
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
        provider: { '@type': 'Organization', '@id': absoluteUrl('/#organization'), name: 'SocialPro', url: SITE_URL },
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
        provider: { '@type': 'Organization', '@id': absoluteUrl('/#organization'), name: 'SocialPro', url: SITE_URL },
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
        provider: { '@type': 'Organization', '@id': absoluteUrl('/#organization'), name: 'SocialPro', url: SITE_URL },
        url: absoluteUrl('/servicios'),
        inLanguage: 'es',
      },
    },
  ],
};


const professionalServiceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  '@id': `${SITE_URL}/servicios`,
  name: 'SocialPro — Agencia de Performance Marketing Gaming',
  description:
    'Agencia especializada en performance influencer marketing gaming, esports e iGaming. Streamers de CS2, Valorant, Twitch y YouTube en España y LatAm.',
  url: `${SITE_URL}/servicios`,
  telephone: '+34-604-868-426',
  email: 'marketing@socialpro.es',
  priceRange: '$$',
  areaServed: [
    { '@type': 'Country', name: 'España' },
    { '@type': 'Country', name: 'México' },
    { '@type': 'Country', name: 'Argentina' },
    { '@type': 'Country', name: 'Colombia' },
    { '@type': 'Country', name: 'Chile' },
    { '@type': 'Continent', name: 'Europa' },
  ],
  knowsAbout: [
    'Influencer Marketing Gaming',
    'iGaming Influencer Marketing',
    'CS2 Streamers Marketing',
    'Valorant Influencer Marketing',
    'Twitch Marketing España',
    'YouTube Gaming Marketing',
    'Esports Sponsorship',
    'FTD Tracking',
    'Performance Marketing Gaming',
  ],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Servicios de Marketing Gaming',
    itemListElement: [
      {
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: 'Campañas iGaming con Streamers', url: `${SITE_URL}/servicios/igaming` },
      },
      {
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: 'Gestión de Talentos Gaming', url: `${SITE_URL}/talentos` },
      },
      {
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: 'Gestión YouTube Gaming', url: `${SITE_URL}/servicios` },
      },
    ],
  },
};

const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: 'Servicios', url: absoluteUrl('/servicios') },
]);

export default function ServiciosPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(professionalServiceJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div>
        <h1 className="sr-only">Agencia Marketing Gaming e iGaming</h1>
        <ServicesSection />
        {/* Internal linking to niche SEO landings */}
        <nav aria-label="Especialidades" className="bg-sp-off border-t border-sp-border py-8">
          <div className="max-w-5xl mx-auto px-6">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-sp-muted mb-4">Especialidades</p>
            <div className="flex flex-wrap gap-2">
              {[
                { href: '/cs2-influencer-marketing', label: 'CS2 Influencer Marketing' },
                { href: '/valorant-influencers-agency', label: 'Valorant Influencers Agency' },
                { href: '/esports-marketing-agency', label: 'Esports Marketing Agency' },
                { href: '/twitch-streamers-agency', label: 'Twitch Streamers Agency' },
                { href: '/betting-influencers', label: 'Betting Influencers' },
              ].map(({ href, label }) => (
                <Link key={href} href={href} className="text-xs font-semibold text-sp-muted hover:text-sp-orange border border-sp-border hover:border-sp-orange rounded-full px-3 py-1.5 transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}
