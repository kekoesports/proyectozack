import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { requireAnyRole } from '@/lib/auth-guard';
import { BrandsCrmManager } from '@/components/admin/brands/BrandsCrmManager';
import { listCrmBrands, getBrandContacts, listBrandFollowups, listUpcomingFollowups } from '@/lib/queries/crmBrands';

export default async function AdminBrandsPage(): Promise<React.ReactElement> {
  const session = await requireAnyRole(['admin', 'staff'], '/admin/login');
  const isStaff = session.user.role === 'staff';
  const filterUserId = isStaff ? session.user.id : undefined;

  const [crmBrands, upcomingFollowups] = await Promise.all([
    listCrmBrands(filterUserId),
    listUpcomingFollowups(filterUserId),
  ]);

  const contactsByBrand: Record<number, Awaited<ReturnType<typeof getBrandContacts>>> = {};
  const followupsByBrand: Record<number, Awaited<ReturnType<typeof listBrandFollowups>>> = {};

  await Promise.all(
    crmBrands.map(async (b) => {
      const [contacts, followups] = await Promise.all([
        getBrandContacts(b.id),
        listBrandFollowups(b.id),
      ]);
      contactsByBrand[b.id] = contacts;
      followupsByBrand[b.id] = followups;
    }),
  );

  const activaCount = crmBrands.filter((b) => b.status === 'activa').length;
  const leadCount   = crmBrands.filter((b) => b.status === 'lead').length;

  return (
    <div>
      <AdminPageHeader
        title="Marcas"
        subtitle="Gestión de marcas CRM"
        stats={[
          { label: 'activas', value: activaCount, accent: '#16a34a' },
          { label: 'leads',   value: leadCount,   accent: '#8b3aad' },
          { label: 'total',   value: crmBrands.length },
        ]}
      />
      <BrandsCrmManager
        brands={crmBrands}
        contactsByBrand={contactsByBrand}
        followupsByBrand={followupsByBrand}
        upcomingFollowups={upcomingFollowups}
      />
    </div>
  );
}
