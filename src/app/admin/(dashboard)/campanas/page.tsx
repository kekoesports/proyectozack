import { db } from '@/lib/db';
import { user as userTable } from '@/db/schema';
import { inArray } from 'drizzle-orm';

import { requirePermission } from '@/lib/permissions';
import { listCampaigns } from '@/lib/queries/campaigns';
import { listCrmBrands, getBrandContacts } from '@/lib/queries/crmBrands';
import { getAllTalents } from '@/lib/queries/talents';
import { CampaignsList } from '@/features/admin/campaigns/components/CampaignsList';

import type { CrmBrandContact } from '@/types';

export default async function AdminCampanasPage(): Promise<React.ReactElement> {
  const session = await requirePermission('campanas', 'read');
  const role = session.user.role;
  const isManager = role === 'manager';

  const [campaigns, crmBrandsList, allTalents, staffUsers] = await Promise.all([
    listCampaigns({ session: { userId: session.user.id, role } }),
    listCrmBrands(),
    getAllTalents(),
    db
      .select({ id: userTable.id, name: userTable.name })
      .from(userTable)
      .where(inArray(userTable.role, ['admin', 'manager', 'staff']))
      .orderBy(userTable.name),
  ]);

  const contactsByBrand: Record<number, readonly CrmBrandContact[]> = {};
  await Promise.all(
    crmBrandsList.map(async (b) => {
      const contacts = await getBrandContacts(b.id);
      contactsByBrand[b.id] = contacts;
    }),
  );

  const brands = crmBrandsList.map((b) => ({ id: b.id, name: b.name }));
  const talents = allTalents.map((t) => ({ id: t.id, name: t.name }));

  return (
    <CampaignsList
      campaigns={campaigns}
      isManager={isManager}
      brands={brands}
      talents={talents}
      staffUsers={staffUsers}
      contactsByBrand={contactsByBrand}
    />
  );
}
