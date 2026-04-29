import type { Metadata } from 'next';
import { getTeam } from '@/lib/queries/content';
import { AboutSection } from '@/features/marketing-site/components/AboutSection';
import { TeamGrid } from '@/features/marketing-site/components/TeamGrid';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Agencia Gaming España desde 2012',
  description:
    'SocialPro — agencia gaming fundada en Madrid en 2012 por ex-profesionales de esports. Especialistas en iGaming, CS2 y el ecosistema hispano.',
  alternates: {
    canonical: '/nosotros',
  },
};

export default async function NosotrosPage() {
  const team = await getTeam();

  return (
    <main>
      <h1 className="sr-only">Agencia Gaming España desde 2012</h1>
      <AboutSection />
      <TeamGrid team={team} />
    </main>
  );
}
