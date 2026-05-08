import { Suspense } from 'react';
import dynamic from 'next/dynamic';
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

// Client components below-fold: lazy-load JS, SSR preserved
const MetricsSection  = dynamic(() => import('@/features/marketing-site/components/MetricsSection').then(m => ({ default: m.MetricsSection })));
const ServicesSection = dynamic(() => import('@/features/marketing-site/components/ServicesSection').then(m => ({ default: m.ServicesSection })));
const CtaSection      = dynamic(() => import('@/features/marketing-site/components/CtaSection').then(m => ({ default: m.CtaSection })));
const FaqSection      = dynamic(() => import('@/features/marketing-site/components/FaqSection').then(m => ({ default: m.FaqSection })));
const ContactSection  = dynamic(() => import('@/features/contact/components/ContactSection').then(m => ({ default: m.ContactSection })));
const LiveSection     = dynamic(() => import('@/features/live/components/LiveSection').then(m => ({ default: m.LiveSection })));

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

// Revalidate every hour (ISR)
export const revalidate = 3600;

const faqJsonLd = {
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
  const [talents, brands] = await Promise.all([
    getTalents(),
    getBrands(),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Hero />
      <Marquee />
      <BrandsCarousel brands={brands} />
      <TalentSection talents={talents} />
      <LiveSection />
      <MetricsSection />
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
