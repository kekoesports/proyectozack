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

  const eur = (n: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

  const totalRevenue    = campaigns.reduce((s, c) => s + Number(c.amountBrand ?? 0), 0);
  const totalTalent     = campaigns.reduce((s, c) => s + Number(c.amountTalent ?? 0), 0);
  const totalMargin     = totalRevenue - totalTalent;
  const pendingBrand    = campaigns.filter((c) => !c.brandPaid).reduce((s, c) => s + Number(c.amountBrand ?? 0), 0);
  const pendingTalent   = campaigns.filter((c) => !c.talentPaid).reduce((s, c) => s + Number(c.amountTalent ?? 0), 0);
  const activeCount     = campaigns.filter((c) => c.status === 'activa').length;
  const finishedCount   = campaigns.filter((c) => c.status === 'finalizada').length;

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Tratos"
        subtitle="Gestión de campañas, acuerdos y pagos"
        stats={[
          { label: 'total',          value: campaigns.length },
          { label: 'activos',        value: activeCount,       accent: '#16a34a' },
          { label: 'finalizados',    value: finishedCount,     accent: '#5b9bd5' },
          { label: 'revenue',        value: eur(totalRevenue), accent: '#f5632a' },
          { label: 'pdte. cobro',    value: eur(pendingBrand), accent: '#f59e0b' },
          { label: 'pdte. talent',   value: eur(pendingTalent),accent: '#ef4444' },
          { label: 'margen total',   value: eur(totalMargin),  accent: totalMargin >= 0 ? '#16a34a' : '#ef4444' },
        ]}
        actions={[]}
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
