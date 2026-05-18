import type { Metadata } from 'next';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { absoluteUrl, SITE_URL } from '@/lib/site-url';
import { safeJsonLd } from '@/lib/safeJsonLd';
import { getTalents } from '@/lib/queries/talents';
import { getBrands, getCollaborators, getTeam } from '@/lib/queries/content';
import { getCaseStudies } from '@/lib/queries/cases';
import { getPortfolioItems } from '@/lib/queries/portfolio';

// Above-fold + Server Components: loaded eagerly
import { Hero } from '@/features/marketing-site/components/Hero';
import { Marquee } from '@/features/marketing-site/components/Marquee';
import { BrandsCarousel } from '@/features/marketing-site/components/BrandsCarousel';
import { TalentSection } from '@/features/marketing-site/components/TalentSection';
import { CollabsSection } from '@/features/marketing-site/components/CollabsSection';
import { CasesSection } from '@/features/marketing-site/components/CasesSection';
import { PortfolioSection } from '@/features/marketing-site/components/PortfolioSection';
import { AboutSection } from '@/features/marketing-site/components/AboutSection';
import { TeamGrid } from '@/features/marketing-site/components/TeamGrid';
import { LiveSection } from '@/features/live/components/LiveSection';
import { Cs2LabCard } from '@/components/cs2-lab/Cs2LabCard';
import { NewsLatestModule } from '@/features/news/components/NewsLatestModule';
import { getNewsPosts } from '@/lib/queries/posts';

// Client components below-fold: lazy-load JS, SSR preserved
const MetricsSection  = dynamic(() => import('@/features/marketing-site/components/MetricsSection').then(m => ({ default: m.MetricsSection })));
const ServicesSection = dynamic(() => import('@/features/marketing-site/components/ServicesSection').then(m => ({ default: m.ServicesSection })));
const CtaSection      = dynamic(() => import('@/features/marketing-site/components/CtaSection').then(m => ({ default: m.CtaSection })));
// FaqSection is now a Server Component — regular import, no client JS bundle
import { FaqSection } from '@/features/marketing-site/components/FaqSection';
const ContactSection  = dynamic(() => import('@/features/contact/components/ContactSection').then(m => ({ default: m.ContactSection })));

async function CollabsSectionAsync() {
  const collaborators = await getCollaborators();
  return <CollabsSection collaborators={collaborators} />;
}

async function CasesSectionAsync() {
  const cases = await getCaseStudies();
  return <CasesSection cases={cases} />;
}

async function PortfolioSectionAsync() {
  const items = await getPortfolioItems();
  return <PortfolioSection items={items} />;
}

async function TeamGridAsync() {
  const team = await getTeam();
  return <TeamGrid team={team} />;
}

export const metadata: Metadata = {
  title: 'SocialPro — Agencia Gaming & iGaming | España y LatAm',
  description:
    'Agencia de talentos gaming e iGaming fundada en 2012. Streamers verificados de CS2, Valorant e iGaming en España y LatAm. FTD tracking, compliance DGOJ y ROI medible desde el panel del operador.',
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: 'SocialPro — Agencia Gaming & iGaming | España y LatAm',
    description:
      '+13 años conectando creadores gaming con marcas. CS2, Valorant, iGaming. +340 FTDs verificados. España + 6 mercados LATAM.',
    url: SITE_URL,
    siteName: 'SocialPro',
    locale: 'es_ES',
    type: 'website',
    images: [{
      url: absoluteUrl('/og-socialpro.png'),
      width: 1200,
      height: 630,
      alt: 'SocialPro — Agencia de Performance Marketing Gaming y Esports',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SocialPro — Agencia Gaming & iGaming | España y LatAm',
    description:
      '+13 años conectando creadores gaming con marcas. CS2, Valorant, iGaming. +340 FTDs verificados.',
    images: [absoluteUrl('/og-socialpro.png')],
  },
};

// Revalidate every hour (ISR)
export const revalidate = 3600;


// FAQPage schema — matches the visible FAQ section rendered by FaqSection
const homepageFaqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '¿Cómo funciona el proceso de colaboración con una marca?',
      acceptedAnswer: { '@type': 'Answer', text: 'Primero analizamos los objetivos de la marca y el público objetivo. Luego seleccionamos los creadores más relevantes de nuestro roster, diseñamos la campaña, coordinamos la ejecución y entregamos un informe detallado con métricas de rendimiento (views, CTR, FTDs, conversiones).' },
    },
    {
      '@type': 'Question',
      name: '¿En qué mercados operáis?',
      acceptedAnswer: { '@type': 'Answer', text: 'Actualmente operamos en España, Latinoamérica y el mercado de habla hispana global. Nuestros creadores cubren Twitch, YouTube y plataformas de CS2, con audiencias en más de 3 mercados activos.' },
    },
    {
      '@type': 'Question',
      name: '¿Cuánto cuesta una campaña?',
      acceptedAnswer: { '@type': 'Answer', text: 'El coste depende del alcance, los creadores seleccionados y la duración de la campaña. Trabajamos con presupuestos flexibles y siempre proporcionamos un ROI estimado antes de lanzar. Contáctanos para una propuesta personalizada.' },
    },
    {
      '@type': 'Question',
      name: '¿Cómo medís los resultados?',
      acceptedAnswer: { '@type': 'Answer', text: 'Utilizamos tracking personalizado para cada campaña: enlaces UTM, píxeles de conversión, códigos de referido y paneles de analytics en tiempo real. Entregamos informes con métricas clave como CTR (8.4% medio), FTDs, registros y ROI.' },
    },
    {
      '@type': 'Question',
      name: '¿Qué diferencia a SocialPro de otras agencias?',
      acceptedAnswer: { '@type': 'Answer', text: 'Con más de 13 años en la industria del iGaming, somos una de las agencias más experimentadas del mercado hispano. No somos una agencia genérica — nuestro equipo viene del gaming y entiende a las audiencias. Ofrecemos datos reales, no promesas.' },
    },
    {
      '@type': 'Question',
      name: '¿Soy creador de contenido, cómo puedo unirme?',
      acceptedAnswer: { '@type': 'Answer', text: 'Si eres streamer o creador de contenido en el nicho gaming/iGaming, envíanos tu perfil a través del formulario de contacto seleccionando "Soy un creador de contenido". Evaluamos tu canal, audiencia y potencial para incluirte en nuestro roster de talentos.' },
    },
    {
      '@type': 'Question',
      name: '¿Cuánto tiempo tarda en lanzarse una campaña?',
      acceptedAnswer: { '@type': 'Answer', text: 'Una campaña típica tarda entre 1 y 3 semanas desde el briefing hasta el lanzamiento, dependiendo de la complejidad. Para lanzamientos urgentes, podemos activar campañas en menos de 7 días con nuestro roster de creadores verificados.' },
    },
  ],
};

export default async function HomePage() {
  const [talents, brands, newsPosts] = await Promise.all([
    getTalents(),
    getBrands(),
    getNewsPosts(),
  ]);
  const latestNews = [...newsPosts]
    .sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0))
    .slice(0, 3);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(homepageFaqJsonLd) }} />
      <Hero />
      <Marquee />
      <BrandsCarousel brands={brands} />
      <TalentSection talents={talents} />
      <Suspense>
        <LiveSection />
      </Suspense>
      <MetricsSection />
      <NewsLatestModule posts={latestNews} />
      <Cs2LabCard variant="full" ctaId="home_cs2_lab_full" />
      <Suspense>
        <CollabsSectionAsync />
      </Suspense>
      <ServicesSection />
      <Suspense>
        <CasesSectionAsync />
      </Suspense>
      <Suspense>
        <PortfolioSectionAsync />
      </Suspense>
      <AboutSection />
      <Suspense>
        <TeamGridAsync />
      </Suspense>
      <CtaSection />
      <FaqSection />
      <ContactSection />
    </>
  );
}
