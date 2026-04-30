import { AdminPageHeader } from '@/features/admin/_shared/components/AdminPageHeader';
import { getAdminRosterWithGrowth } from '@/lib/queries/talents';
import { listAllVerticals } from '@/lib/queries/talentBusiness';
import { RosterSpreadsheet } from '@/features/admin/talents/components/RosterSpreadsheet';
import { InfluencerCardsView } from '@/features/admin/talents/components/InfluencerCardsView';
import { InfluencerImport } from '@/features/admin/talents/components/InfluencerImport';
import { BrandsTabs } from '@/features/admin/brands/components/BrandsTabs';
import type { TalentVertical } from '@/types';

type CurrentTalent = {
  id: number;
  name: string;
  socials: {
    id: number;
    talentId: number;
    platform: string;
    handle: string;
    followersDisplay: string;
    profileUrl: string | null;
    avgViewers: number | null;
  }[];
};

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

  // Derivar CurrentTalent[] para StatsImportPanel (actualizar estadísticas)
  const roster: CurrentTalent[] = creators.map((c) => ({
    id:      c.id,
    name:    c.name,
    socials: c.socials.map((s) => ({
      id:               s.id,
      talentId:         c.id,
      platform:         s.platform,
      handle:           s.handle           ?? '',
      followersDisplay: s.followersDisplay  ?? '-',
      profileUrl:       s.profileUrl        ?? null,
      avgViewers:       s.avgViewers        ?? null,
    })),
  }));

  return (
    <div>
      <AdminPageHeader
        title="Influencers"
        stats={[
          { label: 'creadores',   value: creators.length, accent: '#f5632a' },
          { label: 'plataformas', value: platformSet.size },
          ...(missingPhotoCount > 0
            ? [{ label: 'sin foto', value: missingPhotoCount, accent: '#f59e0b' }]
            : []),
        ]}
        actions={[
          {
            label: missingPhotoCount > 0 ? `Fotos (${missingPhotoCount})` : 'Gestionar fotos',
            href:  '/admin/talents/fotos',
          },
        ]}
      />

      <BrandsTabs
        defaultKey="cards"
        tabs={[
          {
            key:     'cards',
            label:   'Tarjetas',
            content: (
              <InfluencerCardsView
                creators={creators}
                verticalsByTalent={verticalsByTalent}
              />
            ),
          },
          {
            key:     'table',
            label:   'Tabla',
            content: (
              <RosterSpreadsheet creators={creators} verticalsByTalent={verticalsByTalent} />
            ),
          },
          {
            key:     'import',
            label:   'Importar / Exportar',
            content: (
              <InfluencerImport />
            ),
          },
        ]}
      />
    </div>
  );
}
