import { db } from '@/lib/db';
import { user as userTable } from '@/db/schema';
import { inArray } from 'drizzle-orm';

import { requirePermission } from '@/lib/permissions';
import { ASSIGNABLE_TEAM_ROLES } from '@/lib/team-roles';
import { listCampaigns } from '@/lib/queries/campaigns';
import { listCrmBrands, getBrandContacts } from '@/lib/queries/crmBrands';
import { getAllTalents } from '@/lib/queries/talents';
import { listInvoices } from '@/lib/queries/invoices';
import { getUsdEurRate } from '@/lib/exchangeRate';
import { CampaignsList } from '@/features/admin/campaigns/components/CampaignsList';

import type { CrmBrandContact, CampaignWithRelations } from '@/types';

export default async function AdminCampanasPage(): Promise<React.ReactElement> {
  const session = await requirePermission('campanas', 'read');
  const role = session.user.role;
  const isManager = role === 'manager';

  const [rawCampaigns, invoices, crmBrandsList, allTalents, staffUsers, exchangeRate] = await Promise.all([
    listCampaigns({ session: { userId: session.user.id, role } }),
    listInvoices({}),
    listCrmBrands(),
    getAllTalents(),
    db
      .select({ id: userTable.id, name: userTable.name })
      .from(userTable)
      .where(inArray(userTable.role, [...ASSIGNABLE_TEAM_ROLES]))
      .orderBy(userTable.name),
    getUsdEurRate(),
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

  const campaigns: CampaignWithRelations[] = rawCampaigns.map((c) => {
    const brand  = Number(c.amountBrand  ?? 0);
    const talent = Number(c.amountTalent ?? 0);
    const comm   = brand - talent;
    const campInvoices = invoices.filter((i) => i.campaignId === c.id);
    const paidIncome   = campInvoices.filter((i) => i.kind === 'income'  && (i.status === 'cobrada' || i.status === 'pagada'));
    const paidExpense  = campInvoices.filter((i) => i.kind === 'expense' && (i.status === 'cobrada' || i.status === 'pagada'));
    const totalInvoicedBrand = paidIncome.reduce((s, i)  => s + Number(i.totalAmount), 0);
    const totalPaidTalent    = paidExpense.reduce((s, i) => s + Number(i.totalAmount), 0);
    return {
      ...c,
      brandName:  brands.find((b) => b.id === c.brandId)?.name  ?? null,
      talentName: talents.find((t) => t.id === c.talentId)?.name ?? null,
      ownerName:  null,
      brandPaid:  totalInvoicedBrand === 0 ? 'no' : totalInvoicedBrand >= brand  ? 'si' : 'parcial',
      talentPaid: totalPaidTalent    === 0 ? 'no' : totalPaidTalent    >= talent ? 'si' : 'parcial',
      totalInvoicedBrand,
      totalPaidTalent,
      commissionAmount: comm,
      commissionPct:    brand > 0 ? (comm / brand) * 100 : 0,
    };
  });

  return (
    <CampaignsList
      campaigns={campaigns}
      isManager={isManager}
      brands={brands}
      talents={talents}
      staffUsers={staffUsers}
      contactsByBrand={contactsByBrand}
      rate={exchangeRate.rate}
      rateDate={exchangeRate.date}
      rateIsEstimated={exchangeRate.isEstimated}
    />
  );
}
