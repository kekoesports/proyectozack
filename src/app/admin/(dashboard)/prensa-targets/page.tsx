import { requireAnyRole } from '@/lib/auth-guard';
import { getAllPressTargets } from '@/lib/queries/pressTargets';
import { PressTargetsTable } from '@/features/admin/pressTargets/components/PressTargetsTable';

export default async function AdminPressTargetsPage(): Promise<React.ReactElement> {
  await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');
  const items = await getAllPressTargets();

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-4 mb-6">
        <h1 className="font-display text-3xl font-black uppercase text-sp-admin-text">
          Prensa Targets
        </h1>
        <span className="text-xs text-sp-admin-muted tabular-nums">
          {items.length} {items.length === 1 ? 'medio' : 'medios'}
        </span>
      </div>

      <p className="text-sm text-sp-admin-muted -mt-3">
        Medios, blogs, foros y periodistas hispanohablantes para distribuir notas de prensa. Sincronizado desde la skill personal en cada <code className="text-sp-admin-text">git push</code>.
      </p>

      <PressTargetsTable items={items} />
    </div>
  );
}
