import { asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { crmBrands, talents } from '@/db/schema';
import { listCampaigns } from '@/lib/queries/campaigns';
import { getAllStaffUsers } from '@/lib/queries/staffUsers';
import { requireAnyRole } from '@/lib/auth-guard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { CampaignsManager } from '@/components/admin/campaigns/CampaignsManager';

export const metadata = { title: 'Tratos | Admin' };

export default async function CampanasPage(): Promise<React.ReactElement> {
  const session = await requireAnyRole(['admin', 'staff'], '/admin/login');
  const isStaff = session.user.role === 'staff';

  const [campaigns, brandsList, talentsList, staffUsers] = await Promise.all([
    listCampaigns(isStaff ? { responsibleUserId: session.user.id } : undefined),
    db.select({ id: crmBrands.id, name: crmBrands.name }).from(crmBrands).orderBy(asc(crmBrands.name)),
    db.select({ id: talents.id, name: talents.name }).from(talents).orderBy(asc(talents.name)),
    getAllStaffUsers(),
  ]);

  const activeCount = campaigns.filter((c) => c.status === 'activa').length;
  const totalRevenue = campaigns.reduce((s, c) => s + Number(c.amountBrand ?? 0), 0);
  const pendingPayment = campaigns.filter((c) => !c.brandPaid).reduce((s, c) => s + Number(c.amountBrand ?? 0), 0);

  const formatEur = (n: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Tratos"
        stats={[
          { label: 'total', value: campaigns.length },
          { label: 'activos', value: activeCount, accent: '#16a34a' },
          { label: 'revenue', value: formatEur(totalRevenue), accent: '#f5632a' },
          { label: 'pendiente cobro', value: formatEur(pendingPayment), accent: '#f59e0b' },
        ]}
      />

      <CampaignsManager
        campaigns={campaigns}
        brands={brandsList}
        talents={talentsList}
        users={staffUsers.map((u) => ({ id: u.id, name: u.name }))}
      />
    </div>
  );
}
