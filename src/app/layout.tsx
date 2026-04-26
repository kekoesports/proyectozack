import type { Metadata } from 'next';
import { Inter, Barlow_Condensed } from 'next/font/google';
import './globals.css';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { PublicChrome } from '@/components/layout/PublicChrome';
import { CookieConsent } from '@/components/layout/CookieConsent';
import { MotionRoot } from '@/components/layout/MotionRoot';
import { SITE_URL, absoluteUrl } from '@/lib/site-url';

const inter = Inter({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const barlowCondensed = Barlow_Condensed({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'SocialPro — Agencia Gaming & Esports',
    template: '%s | SocialPro',
  },
  description:
    'Agencia de talentos gaming y esports. Conectamos streamers y creadores con las mejores marcas de iGaming, periféricos y entretenimiento.',
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
    languages: {
      'es': SITE_URL,
      'x-default': SITE_URL,
    },
  },
  openGraph: {
    title: 'SocialPro — Agencia Gaming & Esports',
    description:
      'Conectamos streamers y creadores con las mejores marcas de iGaming. +13 años, +15M views/mes, +340 FTDs.',
    url: SITE_URL,
    siteName: 'SocialPro',
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SocialPro — Agencia Gaming & Esports',
    description:
      'Conectamos streamers y creadores con las mejores marcas de iGaming. +13 años, +15M views/mes.',
  },
  manifest: '/manifest.json',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': absoluteUrl('/#organization'),
      name: 'SocialPro',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/logo.png'),
        width: 512,
        height: 512,
      },
      description:
        'Agencia de talentos gaming y esports. Conectamos streamers y creadores con las mejores marcas de iGaming.',
      foundingDate: '2012',
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+34-604-868-426',
        email: 'marketing@socialpro.es',
        contactType: 'sales',
        availableLanguage: ['Spanish', 'English'],
      },
      sameAs: [
        'https://www.instagram.com/socialproes/',
        'https://x.com/SocialProES',
        'https://www.facebook.com/SocialProES',
        'https://www.linkedin.com/company/socialproes',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': absoluteUrl('/#website'),
      url: SITE_URL,
      name: 'SocialPro',
      publisher: { '@id': absoluteUrl('/#organization') },
      inLanguage: 'es',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: absoluteUrl('/blog?q={search_term_string}'),
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'LocalBusiness',
      '@id': absoluteUrl('/#localbusiness'),
      name: 'SocialPro',
      url: SITE_URL,
      image: absoluteUrl('/logo.png'),
      telephone: '+34-604-868-426',
      email: 'marketing@socialpro.es',
      priceRange: '$$',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'ES',
        addressLocality: 'Madrid',
      },
      areaServed: [
        { '@type': 'Country', name: 'España' },
        { '@type': 'Country', name: 'México' },
        { '@type': 'Country', name: 'Argentina' },
        { '@type': 'Country', name: 'Colombia' },
        { '@type': 'Country', name: 'Chile' },
        { '@type': 'Country', name: 'Turquía' },
        { '@type': 'Continent', name: 'Europa' },
      ],
      makesOffer: [
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Gestión de Talentos Gaming' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Campañas para Marcas iGaming' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Gestión de Canales YouTube' } },
      ],
    },
    {
      '@type': 'SiteNavigationElement',
      '@id': absoluteUrl('/#navigation'),
      name: 'Main Navigation',
      hasPart: [
        { '@type': 'WebPage', name: 'Talentos', url: absoluteUrl('/talentos') },
        { '@type': 'WebPage', name: 'Servicios', url: absoluteUrl('/servicios') },
        { '@type': 'WebPage', name: 'Casos de Éxito', url: absoluteUrl('/casos') },
        { '@type': 'WebPage', name: 'Blog', url: absoluteUrl('/blog') },
        { '@type': 'WebPage', name: 'Nosotros', url: absoluteUrl('/nosotros') },
        { '@type': 'WebPage', name: 'Contacto', url: absoluteUrl('/contacto') },
        { '@type': 'WebPage', name: 'Metodología', url: absoluteUrl('/metodologia') },
        { '@type': 'WebPage', name: 'Para Creadores', url: absoluteUrl('/para-creadores') },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} ${barlowCondensed.variable} antialiased`}>
        <MotionRoot>
          <PublicChrome nav={<Nav />} footer={<Footer />}>
            {children}
          </PublicChrome>
          <CookieConsent />
        </MotionRoot>
      </body>
    </html>
  );
}
