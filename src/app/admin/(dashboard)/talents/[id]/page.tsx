import Link from 'next/link';
import { notFound } from 'next/navigation';

import { requireAnyRole } from '@/lib/auth-guard';
import { getTalentFullProfile } from '@/lib/queries/talents';
import { getLatestSnapshotsByPlatform } from '@/lib/queries/analytics';
import { listFilesByEntity } from '@/lib/queries/files';
import { listCampaignsByTalent } from '@/lib/queries/campaigns';
import { TalentProfileTabs } from '@/components/admin/talents/TalentProfileTabs';

export default async function TalentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  const talentId = Number(id);
  if (!Number.isInteger(talentId) || talentId <= 0) notFound();

  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');
  const isManager = session.user.role === 'manager';

  const [talent, snapshotsByPlatform, geoFiles, campaignSummary] = await Promise.all([
    getTalentFullProfile(talentId),
    getLatestSnapshotsByPlatform(talentId),
    listFilesByEntity('talent', talentId, 'geo_stats'),
    listCampaignsByTalent(talentId),
  ]);

  if (!talent) notFound();

  return (
    <div className="max-w-4xl">
      <Link
        href="/admin/talents"
        className="text-xs text-sp-admin-muted hover:text-sp-admin-text inline-flex items-center gap-1 mb-4 transition-colors"
      >
        ← Volver al roster
      </Link>

      <div className="flex items-start gap-4 mb-6">
        {/* Avatar / initials */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0"
          style={{
            background: `linear-gradient(135deg, ${talent.gradientC1}, ${talent.gradientC2})`,
          }}
          aria-hidden="true"
        >
          {talent.initials}
        </div>
        <div>
          <h1 className="font-display text-3xl font-black uppercase text-sp-admin-text leading-none">
            {talent.name}
          </h1>
          <p className="text-sm text-sp-admin-muted mt-1">{talent.role}</p>
        </div>
      </div>

      <TalentProfileTabs
        talent={talent}
        snapshotsByPlatform={snapshotsByPlatform}
        geoFiles={geoFiles}
        isManager={isManager}
        campaignSummary={campaignSummary}
      />
    </div>
  );
}
