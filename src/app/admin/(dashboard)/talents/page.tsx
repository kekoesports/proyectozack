import Link from 'next/link';
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
      <div className="flex items-baseline justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-baseline gap-4">
          <h1 className="font-display text-3xl font-black uppercase text-sp-admin-text">Roster</h1>
          <span className="text-xs text-sp-admin-muted tabular-nums">
            {creators.length} creadores · {platformSet.size} plataformas
          </span>
        </div>
        <Link
          href="/admin/talents/fotos"
          className={`inline-flex items-center gap-2 text-xs font-semibold rounded-xl px-3 py-2 border transition-colors ${
            missingPhotoCount > 0
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
              : 'border-sp-admin-border text-sp-admin-text hover:bg-sp-admin-hover'
          }`}
        >
          Gestionar fotos
          {missingPhotoCount > 0 && (
            <span className="rounded-full bg-amber-500/30 text-amber-100 px-1.5 py-0.5 text-[10px] tabular-nums font-bold">
              {missingPhotoCount} sin foto
            </span>
          )}
        </Link>
      </div>

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
