import type { Metadata } from 'next';
import { getCaseStudies } from '@/lib/queries/cases';
import { CasesSection } from '@/features/marketing-site/components/CasesSection';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Campañas Gaming — Resultados Reales',
  description:
    'Resultados reales: campañas con RAZER (2.5M reach), 1WIN (8M+ reach), SkinsMonkey (200K€ conversiones). Así trabaja SocialPro con las marcas.',
  alternates: {
    canonical: '/casos',
  },
};

export default async function CasosPage() {
  const cases = await getCaseStudies();

  return (
    <main>
      <h1 className="sr-only">Campañas Gaming — Resultados Reales</h1>
      <CasesSection cases={cases} />
    </main>
  );
}
