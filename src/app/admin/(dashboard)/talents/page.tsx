import Link from 'next/link';
import { requirePermission } from '@/lib/permissions';
import { AdminPageHeader } from '@/features/admin/_shared/components/AdminPageHeader';
import { getAdminRosterWithGrowth, getAllTalents } from '@/lib/queries/talents';
import { listAllVerticals } from '@/lib/queries/talentBusiness';
import { RosterSpreadsheet } from '@/features/admin/talents/components/RosterSpreadsheet';
import { InfluencerCardsView } from '@/features/admin/talents/components/InfluencerCardsView';
import { TalentDataTools, type CurrentTalent } from '@/features/admin/talents/components/TalentDataTools';
import { BrandsTabs } from '@/features/admin/brands/components/BrandsTabs';
import { restoreTalentAction } from '@/app/admin/(dashboard)/talents/actions';
import type { TalentVertical } from '@/types';

export default async function AdminTalentsPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ archived?: string }>;
}): Promise<React.ReactElement> {
  const session = await requirePermission('talentos', 'read');
  const sp = await searchParams;
  const showArchived = sp.archived === '1';

  if (showArchived) {
    const all = await getAllTalents({ includeArchived: true });
    const archived = all.filter((t) => t.archivedAt !== null);

    return (
      <div>
        <AdminPageHeader
          title="Influencers — Archivados"
          stats={[{ label: 'archivados', value: archived.length, accent: '#f59e0b' }]}
        />
        <div className="mb-4">
          <Link
            href="/admin/talents"
            className="text-[12px] font-semibold text-sp-admin-accent hover:underline"
          >
            ← Volver al roster
          </Link>
        </div>
        {archived.length === 0 ? (
          <p className="text-sm text-sp-admin-muted py-8 text-center">No hay talentos archivados.</p>
        ) : (
          <div className="space-y-2">
            {archived.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-4 rounded-lg border border-sp-admin-border bg-sp-admin-card px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Link href={`/admin/talents/${t.id}`} className="font-semibold text-sm text-sp-admin-text hover:text-sp-admin-accent truncate">
                    {t.name}
                  </Link>
                  <span className="shrink-0 inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Archivado
                  </span>
                  {t.archivedAt && (
                    <span className="text-[11px] text-sp-admin-muted shrink-0">
                      {new Date(t.archivedAt).toLocaleDateString('es-ES')}
                    </span>
                  )}
                </div>
                {session.user.role === 'admin' && (
                  <form action={restoreTalentAction.bind(null, t.id)}>
                    <button type="submit" className="shrink-0 text-[12px] font-bold text-sp-admin-accent hover:underline">
                      Restaurar
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

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
          { label: 'Ver archivados', href: '/admin/talents?archived=1' },
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
            label:   'Importar Excel/CSV',
            content: (
              <TalentDataTools
                roster={roster}
                creators={creators}
                verticalsByTalent={verticalsByTalent}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
