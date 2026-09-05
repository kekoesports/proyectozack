import { Suspense } from 'react';
import { requireAnyRole } from '@/lib/auth-guard';
import { getAllTargets } from '@/lib/queries/targets';
import { getAllBrandUsers } from '@/lib/queries/brandUsers';
import { TargetsWorkspace } from '@/features/admin/targets/components/TargetsWorkspace';
import { CreatorDiscoveryOverview } from '@/features/admin/targets/components/CreatorDiscoveryOverview';
import { listRecentCreatorDiscoveryRuns } from '@/lib/queries/creatorDiscoveryRuns';
import { hasPermission } from '@/lib/permissions';
import { listCreatorSearchProfiles, listAutomationRegistry } from '@/lib/queries/creatorSearchProfiles';
import { CreatorSearchProfiles } from '@/features/admin/targets/components/CreatorSearchProfiles';
import { CreatorAutomationRegistry } from '@/features/admin/targets/components/CreatorAutomationRegistry';
import { saveSearchProfileAction, runSearchProfileAction } from './profile-actions';

export default async function AdminTargetsPage(): Promise<React.ReactElement> {
  const session = await requireAnyRole(['admin', 'admin_limited_tasks', 'manager', 'staff'], '/admin/login');
  const [targets, brands, discoveryRuns, profiles, registry] = await Promise.all([
    getAllTargets(),
    getAllBrandUsers(),
    listRecentCreatorDiscoveryRuns(),
    listCreatorSearchProfiles(),
    listAutomationRegistry(),
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
      <CreatorSearchProfiles profiles={profiles.map(({ id, name, config, enabled, version, nextRunAt, lastRunAt }) => (
        // Do not send scheduler lease tokens, actor IDs or other internal fields to the client.
        { id, name, config, enabled, version, nextRunAt, lastRunAt }
      ))} canWrite={hasPermission(session.user.role, 'targets', 'write')}
        saveAction={saveSearchProfileAction} runAction={runSearchProfileAction} />
      <CreatorAutomationRegistry entries={registry} />
      <Suspense fallback={<p className="text-sm text-sp-admin-muted">Cargando filtros de redes…</p>}>
        <TargetsWorkspace targets={targets} brands={brands} />
      </Suspense>
    </div>
  );
}
