import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { db } from '@/lib/db';
import { user as userTable } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAnyRole } from '@/lib/auth-guard';
import { InviteBrandForm } from '@/components/admin/brands/invite-form';
import { BrandsCrmManager } from '@/components/admin/brands/BrandsCrmManager';
import { BrandsTabs } from '@/components/admin/brands/BrandsTabs';
import { listCrmBrands, getBrandContacts, listBrandFollowups, listUpcomingFollowups } from '@/lib/queries/crmBrands';

export default async function AdminBrandsPage(): Promise<React.ReactElement> {
  const session = await requireAnyRole(['admin', 'staff'], '/admin/login');
  const isStaff = session.user.role === 'staff';
  const filterUserId = isStaff ? session.user.id : undefined;

  const [brandUsers, crmBrands, upcomingFollowups] = await Promise.all([
    isStaff
      ? Promise.resolve([])
      : db
          .select({
            id: userTable.id,
            name: userTable.name,
            email: userTable.email,
            createdAt: userTable.createdAt,
          })
          .from(userTable)
          .where(eq(userTable.role, 'brand'))
          .orderBy(desc(userTable.createdAt)),
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

  const tabs = [
    {
      key: 'crm',
      label: 'CRM',
      content: (
        <BrandsCrmManager
          brands={crmBrands}
          contactsByBrand={contactsByBrand}
          followupsByBrand={followupsByBrand}
          upcomingFollowups={upcomingFollowups}
        />
      ),
    },
    ...(!isStaff
      ? [
          {
            key: 'portal',
            label: `Portal (${brandUsers.length})`,
            content: (
              <div className="space-y-6">
                <InviteBrandForm />
                {brandUsers.length === 0 ? (
                  <p className="text-sm text-sp-admin-muted">No hay marcas registradas en el portal. Invita tu primera marca.</p>
                ) : (
                  <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-sp-admin-border bg-sp-admin-bg/50">
                          <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Nombre</th>
                          <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Email</th>
                          <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Creado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {brandUsers.map((brand) => (
                          <tr key={brand.id} className="border-b border-sp-admin-border/50 last:border-0 hover:bg-sp-admin-hover transition-colors">
                            <td className="px-6 py-4 font-medium text-sp-admin-text">{brand.name}</td>
                            <td className="px-6 py-4 text-sp-admin-muted">{brand.email}</td>
                            <td className="px-6 py-4 text-sp-admin-muted">{new Date(brand.createdAt).toLocaleDateString('es-ES')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  const activaCount = crmBrands.filter((b) => b.status === 'activa').length;
  const leadCount = crmBrands.filter((b) => b.status === 'lead').length;

  return (
    <div>
      <AdminPageHeader
        title="Marcas"
        subtitle="Gestión de marcas CRM y portal"
        stats={[
          { label: 'activas', value: activaCount, accent: '#16a34a' },
          { label: 'leads', value: leadCount, accent: '#8b3aad' },
          { label: 'total', value: crmBrands.length },
        ]}
      />
      <BrandsTabs defaultKey="crm" tabs={tabs} />
    </div>
  );
}
