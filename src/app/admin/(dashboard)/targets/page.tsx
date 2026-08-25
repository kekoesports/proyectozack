import { requireAnyRole } from '@/lib/auth-guard';
import { getAllTargets } from '@/lib/queries/targets';
import { getAllBrandUsers } from '@/lib/queries/brandUsers';
import { TargetsSpreadsheet } from '@/features/admin/targets/components/TargetsSpreadsheet';
import { YouTubeTargetDiscovery } from '@/features/admin/targets/components/YouTubeTargetDiscovery';

export default async function AdminTargetsPage(): Promise<React.ReactElement> {
  await requireAnyRole(['admin', 'admin_limited_tasks', 'manager', 'staff'], '/admin/login');
  const [targets, brands] = await Promise.all([
    getAllTargets(),
    getAllBrandUsers(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-4 mb-6">
        <h1 className="font-display text-3xl font-black uppercase text-sp-admin-text">Creadores Target</h1>
        <span className="text-xs text-sp-admin-muted tabular-nums">
          {targets.length} targets
        </span>
      </div>

      <p className="text-sm text-sp-admin-muted -mt-3">
        Descubre canales de CS2 en todo el mundo, revisa actividad y cumplimiento por tipo de campaña, y asigna los perfiles válidos a una marca.
      </p>

      <YouTubeTargetDiscovery />
      <TargetsSpreadsheet targets={targets} brands={brands} />
    </div>
  );
}
