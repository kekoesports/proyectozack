import { db } from '@/lib/db';
import { user as userTable } from '@/db/schema';
import { inArray } from 'drizzle-orm';

import { hasPermission, requirePermission } from '@/lib/permissions';
import { ASSIGNABLE_TEAM_ROLES } from '@/lib/team-roles';
import { listCampaigns } from '@/lib/queries/campaigns';
import { listCrmBrands, getBrandContacts } from '@/lib/queries/crmBrands';
import { getAllTalents } from '@/lib/queries/talents';
import { listInvoices } from '@/lib/queries/invoices';
import { listActiveDeliverablesForCampaigns } from '@/lib/queries/campaign-deliverables-sync';
import { getUsdEurRate } from '@/lib/exchangeRate';
import { CampaignsList } from '@/features/admin/campaigns/components/CampaignsList';

import type { CrmBrandContact, CampaignWithRelations } from '@/types';
import type { CampaignPaymentDerivedStatus } from '@/lib/schemas/campaign';

export default async function AdminCampanasPage(): Promise<React.ReactElement> {
  const session = await requirePermission('campanas', 'read');
  const role = session.user.role;
  const canArchive = role !== 'staff' && hasPermission(role, 'campanas', 'write');

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
    // Los importes se comparan en la divisa nativa del trato. Una factura
    // enlazada en otra moneda necesita su conciliacion/FX antes de descontarla.
    const paidIncome = campInvoices.filter((i) => (
      i.kind === 'income'
      && (i.status === 'cobrada' || i.status === 'pagada')
      && i.currency === c.currency
    ));
    const paidExpense = campInvoices.filter((i) => (
      i.kind === 'expense'
      && (i.status === 'cobrada' || i.status === 'pagada')
      && i.currency === c.currency
    ));
    const totalInvoicedBrand = paidIncome.reduce((s, i)  => s + Number(i.totalAmount), 0);
    const totalPaidTalent    = paidExpense.reduce((s, i) => s + Number(i.totalAmount), 0);
    const brandFromInvoices: CampaignPaymentDerivedStatus  = totalInvoicedBrand === 0 ? 'no' : totalInvoicedBrand >= brand  ? 'si' : 'parcial';
    const talentFromInvoices: CampaignPaymentDerivedStatus = totalPaidTalent    === 0 ? 'no' : totalPaidTalent    >= talent ? 'si' : 'parcial';
    const manualBrand  = c.cobroConfirmado === true;
    const manualTalent = c.pagoTalentConfirmado === true;
    return {
      ...c,
      brandName:  brands.find((b) => b.id === c.brandId)?.name  ?? null,
      talentName: talents.find((t) => t.id === c.talentId)?.name ?? null,
      ownerName:  null,
      brandPaid:  manualBrand  ? 'si' : brandFromInvoices,
      talentPaid: manualTalent ? 'si' : talentFromInvoices,
      brandPaidSource:  manualBrand  ? 'manual' : brandFromInvoices  === 'no' ? 'none' : 'invoice',
      talentPaidSource: manualTalent ? 'manual' : talentFromInvoices === 'no' ? 'none' : 'invoice',
      totalInvoicedBrand,
      totalPaidTalent,
      commissionAmount: comm,
      commissionPct:    brand > 0 ? (comm / brand) * 100 : 0,
    };
  });

  const deliverablesByCampaign = await listActiveDeliverablesForCampaigns(
    campaigns.map((c) => c.id),
  );

  // Tracking sheet info por campaign (PR2). Se serializa a plano para
  // evitar pasar Date en payload de RSC → cliente.
  const trackingByCampaign: Record<number, {
    url: string | null;
    lastSyncedAt: string | null;
    syncError: string | null;
  }> = {};
  for (const c of rawCampaigns) {
    trackingByCampaign[c.id] = {
      url: c.trackingSheetUrl ?? null,
      lastSyncedAt: c.lastTrackingSyncAt ? c.lastTrackingSyncAt.toISOString() : null,
      syncError: c.trackingSyncError ?? null,
    };
  }

  return (
    <CampaignsList
      campaigns={campaigns}
      canArchive={canArchive}
      brands={brands}
      talents={talents}
      staffUsers={staffUsers}
      contactsByBrand={contactsByBrand}
      rate={exchangeRate.rate}
      rateDate={exchangeRate.date}
      rateIsEstimated={exchangeRate.isEstimated}
      deliverablesByCampaign={deliverablesByCampaign}
      trackingByCampaign={trackingByCampaign}
    />
  );
}
