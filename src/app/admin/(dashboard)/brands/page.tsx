import { AdminPageHeader } from '@/features/admin/_shared/components/AdminPageHeader';
import { db } from '@/lib/db';
import { user as userTable } from '@/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';

import { requireAnyRole } from '@/lib/auth-guard';
import { InviteBrandForm } from '@/features/admin/brands/components/invite-form';
import { BrandsCrmManager } from '@/features/admin/brands/components/BrandsCrmManager';
import { BrandsTabs } from '@/features/admin/brands/components/BrandsTabs';
import { listCrmBrands, getBrandContacts, listBrandFollowups, listUpcomingFollowups } from '@/lib/queries/crmBrands';
import { listAllCampaigns } from '@/lib/queries/campaigns';

import type { Role } from '@/lib/auth-guard';
import type { CampaignRow } from '@/types';

export default async function AdminBrandsPage(): Promise<React.ReactElement> {
  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');
  const role = session.user.role as Role;
  const isStaff = role === 'staff';
  const isManager = role === 'manager';

  const [brandUsers, crmBrandsList, upcomingFollowups, staffUsers, allCampaigns] = await Promise.all([
    isStaff || isManager
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
    listCrmBrands({ userId: session.user.id, role }),
    listUpcomingFollowups({ userId: session.user.id, role }),
    db
      .select({ id: userTable.id, name: userTable.name })
      .from(userTable)
      .where(inArray(userTable.role, ['admin', 'manager', 'staff']))
      .orderBy(userTable.name),
    listAllCampaigns(),
  ]);

  const contactsByBrand: Record<number, Awaited<ReturnType<typeof getBrandContacts>>> = {};
  const followupsByBrand: Record<number, Awaited<ReturnType<typeof listBrandFollowups>>> = {};

  await Promise.all(
    crmBrandsList.map(async (b) => {
      const [contacts, followups] = await Promise.all([
        getBrandContacts(b.id),
        listBrandFollowups(b.id),
      ]);
      contactsByBrand[b.id] = contacts;
      followupsByBrand[b.id] = followups;
    }),
  );

  // Group campaigns by brandId (client-side filtering avoids N+1 queries)
  const campaignsByBrand: Record<number, CampaignRow[]> = {};
  for (const c of allCampaigns) {
    const existing = campaignsByBrand[c.brandId];
    if (existing) {
      existing.push(c);
    } else {
      campaignsByBrand[c.brandId] = [c];
    }
  }

  const tabs = [
    {
      key: 'crm',
      label: 'CRM',
      content: (
        <BrandsCrmManager
          brands={crmBrandsList}
          contactsByBrand={contactsByBrand}
          followupsByBrand={followupsByBrand}
          upcomingFollowups={upcomingFollowups}
          campaignsByBrand={campaignsByBrand}
          isManager={isManager}
          staffUsers={staffUsers}
        />
      ),
    },
    ...(!isStaff && !isManager
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

  const activaCount = crmBrandsList.filter((b) => b.status === 'activa').length;
  const leadCount   = crmBrandsList.filter((b) => b.status === 'lead').length;

  return (
    <div>
      <AdminPageHeader
        title="Marcas"
        subtitle="Gestión de marcas CRM"
        stats={[
          { label: 'activas', value: activaCount, accent: '#16a34a' },
          { label: 'leads',   value: leadCount,   accent: '#8b3aad' },
          { label: 'total',   value: crmBrandsList.length },
        ]}
      />
      <BrandsTabs defaultKey="crm" tabs={tabs} />
    </div>
  );
}
