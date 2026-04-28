import { getAllTargets } from '@/lib/queries/targets';
import { getAllBrandUsers } from '@/lib/queries/brandUsers';
import { TargetsSpreadsheet } from '@/components/admin/targets/TargetsSpreadsheet';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

export default async function AdminTargetsPage(): Promise<React.ReactElement> {
  const [targets, brands] = await Promise.all([
    getAllTargets(),
    getAllBrandUsers(),
  ]);

  const byStatus = targets.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Campañas"
        stats={[
          { label: 'total', value: targets.length },
          { label: 'contactados', value: byStatus.contactado ?? 0, accent: '#5b9bd5' },
          { label: 'finalizados', value: byStatus.finalizado ?? 0, accent: '#16a34a' },
          { label: 'descartados', value: byStatus.descartado ?? 0, accent: '#ef4444' },
        ]}
      />
      <TargetsSpreadsheet targets={targets} brands={brands} />
    </div>
  );
}
