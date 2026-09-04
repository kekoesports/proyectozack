import { requireAnyRole } from '@/lib/auth-guard';
import { getAllTargets } from '@/lib/queries/targets';
import { getAllBrandUsers } from '@/lib/queries/brandUsers';
import { TargetsSpreadsheet } from '@/features/admin/targets/components/TargetsSpreadsheet';
import { CreatorDiscoveryHub } from '@/features/admin/targets/components/CreatorDiscoveryHub';
import { CreatorDiscoveryOverview } from '@/features/admin/targets/components/CreatorDiscoveryOverview';
import { listRecentCreatorDiscoveryRuns } from '@/lib/queries/creatorDiscoveryRuns';

export default async function AdminTargetsPage(): Promise<React.ReactElement> {
  await requireAnyRole(['admin', 'admin_limited_tasks', 'manager', 'staff'], '/admin/login');
  const [targets, brands, discoveryRuns] = await Promise.all([
    getAllTargets(),
    getAllBrandUsers(),
    listRecentCreatorDiscoveryRuns(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-4 mb-6">
        <h1 className="font-display text-3xl font-black uppercase text-sp-admin-text">Leads CC</h1>
        <span className="text-xs text-sp-admin-muted tabular-nums">
          {targets.length} leads
        </span>
      </div>

      <p className="text-sm text-sp-admin-muted -mt-3">
        Leads de creadores de contenido (CC) en YouTube, Twitch, Instagram y Kick; conserva el historial comercial y evita duplicados entre ejecuciones.
      </p>

      <CreatorDiscoveryOverview runs={discoveryRuns} />
      <CreatorDiscoveryHub />
      <TargetsSpreadsheet targets={targets} brands={brands} />
    </div>
  );
}
