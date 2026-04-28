import Link from 'next/link';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { getAdminRosterWithGrowth } from '@/lib/queries/talents';
import { listAllVerticals } from '@/lib/queries/talentBusiness';
import { RosterSpreadsheet } from '@/components/admin/talents/RosterSpreadsheet';
import { InfluencerCardsView } from '@/components/admin/talents/InfluencerCardsView';
import { InfluencerImport } from '@/components/admin/talents/InfluencerImport';
import { BrandsTabs } from '@/components/admin/brands/BrandsTabs';
import type { TalentVertical } from '@/types';

export default async function AdminTalentsPage(): Promise<React.ReactElement> {
  const [creators, verticals] = await Promise.all([
    getAdminRosterWithGrowth(),
    listAllVerticals(),
  ]);

  const platformSet = new Set<string>();
  for (const c of creators)
    for (const s of c.socials) platformSet.add(s.platform);

  const verticalsByTalent: Record<number, TalentVertical[]> = {};
  for (const v of verticals) {
    const list = verticalsByTalent[v.talentId] ?? [];
    list.push(v.vertical);
    verticalsByTalent[v.talentId] = list;
  }

  const missingPhotoCount = creators.reduce((acc, c) => (c.photoUrl ? acc : acc + 1), 0);

  return (
    <div>
      <AdminPageHeader
        title="Influencers"
        stats={[
          { label: 'creadores', value: creators.length, accent: '#f5632a' },
          { label: 'plataformas', value: platformSet.size },
          ...(missingPhotoCount > 0 ? [{ label: 'sin foto', value: missingPhotoCount, accent: '#f59e0b' }] : []),
        ]}
        actions={[
          {
            label: missingPhotoCount > 0 ? `Fotos (${missingPhotoCount})` : 'Gestionar fotos',
            href: '/admin/talents/fotos',
          },
        ]}
      />

      <BrandsTabs
        defaultKey="cards"
        tabs={[
          {
            key: 'cards',
            label: 'Tarjetas',
            content: (
              <InfluencerCardsView
                creators={creators}
                verticalsByTalent={verticalsByTalent}
              />
            ),
          },
          {
            key: 'table',
            label: 'Tabla',
            content: (
              <RosterSpreadsheet creators={creators} verticalsByTalent={verticalsByTalent} />
            ),
          },
          {
            key: 'import',
            label: 'Importar CSV',
            content: <InfluencerImport />,
          },
        ]}
      />
    </div>
  );
}
