import { requireRole } from '@/lib/auth-guard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { getStatsRollup, getActiveStatsShares } from '@/lib/queries/stats';
import { env } from '@/lib/env';
import { StatsTable } from '@/components/admin/stats/StatsTable';
import { ShareLinkPanel } from '@/components/admin/stats/ShareLinkPanel';
import { StatsExportPanel } from '@/components/admin/stats/StatsExportPanel';
import { StatsImportPanel } from '@/components/admin/stats/StatsImportPanel';
import { KpiCards } from '@/components/stats/KpiCards';
import type { ReactElement } from 'react';
import type { CurrentTalent } from '@/lib/statsImport';

export default async function AdminStatsPage(): Promise<ReactElement> {
  await requireRole('admin', '/admin/login');

  const [rollup, shares] = await Promise.all([
    getStatsRollup(),
    getActiveStatsShares(),
  ]);

  const shareRows = shares.map((s) => ({
    id: s.id,
    token: s.token,
    createdAt: s.createdAt,
  }));

  const importerRoster: CurrentTalent[] = rollup.rows.map((r) => ({
    id: r.id,
    name: r.name,
    socials: r.socials.map((s) => ({
      id: s.id,
      talentId: r.id,
      platform: s.platform,
      handle: s.handle,
      followersDisplay: s.followersDisplay,
      profileUrl: s.profileUrl,
      avgViewers: s.avgViewers,
    })),
  }));

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Estadísticas"
        stats={[
          { label: 'canales', value: rollup.channelCount, accent: '#f5632a' },
          { label: 'links activos', value: shareRows.length },
        ]}
        actions={[{ label: 'Exportar', href: '#' }]}
      />

      <KpiCards data={rollup} />

      <StatsImportPanel roster={importerRoster} />

      <StatsExportPanel rows={rollup.rows} />

      <ShareLinkPanel shares={shareRows} siteUrl={env.NEXT_PUBLIC_SITE_URL} />

      <StatsTable rows={rollup.rows} />
    </div>
  );
}
