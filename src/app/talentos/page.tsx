import type { Metadata } from 'next';
import { getTalents } from '@/lib/queries/talents';
import { TalentSection } from '@/features/marketing-site/components/TalentSection';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Streamers y Creadores Gaming de Élite',
  description:
    'Roster exclusivo de streamers y creadores de contenido gaming en España y LatAm. CS2, Valorant, Twitch, YouTube. Más de 15M vistas mensuales.',
  alternates: {
    canonical: '/talentos',
  },
};

export default async function TalentosPage() {
  const talents = await getTalents();

  return (
    <main>
      <h1 className="sr-only">Streamers y Creadores Gaming de Élite</h1>
      <TalentSection talents={talents} />
    </main>
  );
}
