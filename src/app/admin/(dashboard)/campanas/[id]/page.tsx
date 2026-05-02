import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq, inArray } from 'drizzle-orm';

import { requireAnyRole } from '@/lib/auth-guard';
import { getCampaignWithRelations } from '@/lib/queries/campaigns';
import { listFilesByEntity } from '@/lib/queries/files';
import { listDeliverablesByCampaign } from '@/lib/queries/deliverables';
import { getContractByCampaign } from '@/lib/queries/contracts';
import { listContractTemplates } from '@/lib/queries/contractTemplates';
import { getIssuerCompanies, listIssuedInvoicesByDeal } from '@/lib/queries/issuedInvoices';
import { buildContractVars } from '@/lib/contractVariables';
import { db } from '@/lib/db';
import { invoices, user as userTable } from '@/db/schema';
import { listCrmBrands, getBrandContacts } from '@/lib/queries/crmBrands';
import { getAllTalents } from '@/lib/queries/talents';
import { CampaignDetailTabs } from '@/features/admin/campaigns/components/CampaignDetailTabs';

import type { CrmBrandContact } from '@/types';

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  const campaignId = Number(id);
  if (!Number.isInteger(campaignId) || campaignId <= 0) notFound();

  const session = await requireAnyRole(['admin', 'manager', 'staff'], '/admin/login');
  const role = session.user.role;
  const isManager = role === 'manager';
  const isAdmin = role === 'admin';

  const [
    campaign,
    campaignFiles,
    campaignInvoices,
    campaignDeliverables,
    crmBrandsList,
    allTalents,
    staffUsers,
    contract,
    contractTemplates,
    issuedInvoices,
    issuerCompanies,
  ] = await Promise.all([
    getCampaignWithRelations(campaignId),
    listFilesByEntity('campaign', campaignId),
    db
      .select()
      .from(invoices)
      .where(eq(invoices.campaignId, campaignId))
      .orderBy(invoices.issueDate),
    listDeliverablesByCampaign(campaignId),
    listCrmBrands(),
    getAllTalents(),
    db
      .select({ id: userTable.id, name: userTable.name })
      .from(userTable)
      .where(inArray(userTable.role, ['admin', 'manager', 'staff']))
      .orderBy(userTable.name),
    getContractByCampaign(campaignId),
    listContractTemplates(),
    listIssuedInvoicesByDeal(campaignId),
    getIssuerCompanies(),
  ]);

  if (!campaign) notFound();

  const contractVars = buildContractVars(campaign);

  // Load contacts for each brand (for the drawer's contact select)
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
    <div className="max-w-4xl">
      <Link
        href="/admin/campanas"
        className="text-xs text-sp-admin-muted hover:text-sp-admin-text inline-flex items-center gap-1 mb-4 transition-colors"
      >
        ← Volver a campañas
      </Link>

      <CampaignDetailTabs
        campaign={campaign}
        campaignFiles={campaignFiles}
        campaignInvoices={campaignInvoices}
        campaignDeliverables={campaignDeliverables}
        isManager={isManager}
        isAdmin={isAdmin}
        brands={brands}
        talents={talents}
        staffUsers={staffUsers}
        contactsByBrand={contactsByBrand}
        contract={contract}
        contractTemplates={contractTemplates}
        contractVars={contractVars}
        issuedInvoices={issuedInvoices}
        issuerCompanies={issuerCompanies}
      />
    </div>
  );
}
