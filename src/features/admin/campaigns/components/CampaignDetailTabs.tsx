'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { StateBadge } from '@/features/admin/_shared/components/StateBadge';
import { CampaignSummaryCard } from '@/features/admin/campaigns/components/CampaignSummaryCard';
import { CampaignPayments } from '@/features/admin/campaigns/components/CampaignPayments';
import { CampaignFiles } from '@/features/admin/campaigns/components/CampaignFiles';
import { CampaignDrawer } from '@/features/admin/campaigns/components/CampaignDrawer';
import { CampaignCnmcChecklist } from '@/features/admin/campaigns/components/CampaignCnmcChecklist';
import { CampaignDeliverables } from '@/features/admin/campaigns/components/CampaignDeliverables';
import { ContractTab } from '@/features/admin/_shared/components/campaigns/ContractTab';
import { DealInvoicePanel } from '@/features/admin/_shared/components/campaigns/DealInvoicePanel';
import { CAMPAIGN_STATUS_LABELS } from '@/lib/schemas/campaign';
import { archiveCampaignAction } from '@/app/admin/(dashboard)/campanas/actions';

import type { Tone } from '@/features/admin/_shared/components/StateBadge';
import type { CampaignWithRelations } from '@/lib/queries/campaigns';
import type { DeliverableWithComments } from '@/lib/queries/deliverables';
import type { CampaignStatus } from '@/lib/schemas/campaign';
import type { ContractTemplate } from '@/lib/queries/contractTemplates';
import type {
  ContractWithSigners,
  FileRecord,
  Invoice,
  CrmBrandContact,
  IssuedInvoiceWithRelations,
  IssuerCompany,
} from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'resumen' | 'pagos' | 'archivos' | 'notas' | 'deliverables' | 'contratos';

const TABS: { id: Tab; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'pagos', label: 'Pagos' },
  { id: 'deliverables', label: 'Deliverables' },
  { id: 'contratos', label: 'Contratos' },
  { id: 'archivos', label: 'Archivos' },
  { id: 'notas', label: 'Notas' },
];

const STATUS_TONE: Record<CampaignStatus, Tone> = {
  propuesta: 'neutral',
  negociacion: 'info',
  aprobada: 'info',
  activa: 'success',
  completada: 'success',
  cancelada: 'danger',
  pendiente_pago: 'warning',
  pagada: 'success',
};

type BrandOption = { readonly id: number; readonly name: string };
type TalentOption = { readonly id: number; readonly name: string };
type StaffOption = { readonly id: string; readonly name: string };

type Props = {
  readonly campaign: CampaignWithRelations;
  readonly campaignFiles: readonly FileRecord[];
  readonly campaignInvoices: readonly Invoice[];
  readonly campaignDeliverables: readonly DeliverableWithComments[];
  readonly isManager: boolean;
  readonly isAdmin: boolean;
  readonly brands: readonly BrandOption[];
  readonly talents: readonly TalentOption[];
  readonly staffUsers: readonly StaffOption[];
  readonly contactsByBrand: Readonly<Record<number, readonly CrmBrandContact[]>>;
  readonly contract: ContractWithSigners | null;
  readonly contractTemplates: readonly ContractTemplate[];
  readonly contractVars: Readonly<Record<string, string>>;
  readonly issuedInvoices: readonly IssuedInvoiceWithRelations[];
  readonly issuerCompanies: readonly IssuerCompany[];
};

// ── Main component ─────────────────────────────────────────────────────────────

/**
 * Orquestador del detalle de una campaña: tabs (resumen / pagos / archivos) con estado activo controlado.
 *
 * @kind client
 * @feature admin/campaigns
 * @route /admin/campanas/[id]
 */
export function CampaignDetailTabs({
  campaign,
  campaignFiles,
  campaignInvoices,
  campaignDeliverables,
  isManager,
  isAdmin,
  brands,
  talents,
  staffUsers,
  contactsByBrand,
  contract,
  contractTemplates,
  contractVars,
  issuedInvoices,
  issuerCompanies,
}: Props): React.ReactElement {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<Tab>('resumen');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  async function handleArchive(): Promise<void> {
    if (!confirm('¿Archivar esta campaña? Podrás restaurarla más tarde.')) return;
    setArchiving(true);
    const result = await archiveCampaignAction(campaign.id);
    if (result.success) {
      startTransition(() => {
        router.push('/admin/campanas');
      });
    } else {
      setArchiving(false);
      alert(result.error ?? 'Error al archivar');
    }
  }

  return (
    <div>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-sp-admin-bg border-b border-sp-admin-border -mx-6 px-6 pb-0 pt-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-2xl font-black uppercase text-sp-admin-text leading-none">
              {campaign.name}
            </h1>
            <StateBadge tone={STATUS_TONE[campaign.status]}>
              {CAMPAIGN_STATUS_LABELS[campaign.status]}
            </StateBadge>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Archivar — oculto para manager */}
            {!isManager && (
              <button
                type="button"
                onClick={() => void handleArchive()}
                disabled={archiving}
                className="rounded-md border border-sp-admin-border px-3 py-1.5 text-xs text-sp-admin-muted hover:text-red-500 hover:border-red-500 transition-colors disabled:opacity-50"
              >
                {archiving ? 'Archivando…' : 'Archivar'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="rounded-md bg-sp-admin-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
            >
              Editar
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-sp-admin-accent text-sp-admin-accent'
                  : 'border-transparent text-sp-admin-muted hover:text-sp-admin-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === 'resumen' && (
          <div className="space-y-4">
            <CampaignSummaryCard campaign={campaign} />
            <CampaignCnmcChecklist campaign={campaign} isManager={isManager} />
          </div>
        )}

        {activeTab === 'pagos' && (
          <CampaignPayments invoices={campaignInvoices} campaign={campaign} />
        )}

        {activeTab === 'archivos' && (
          <CampaignFiles
            files={campaignFiles}
            campaignId={campaign.id}
            isManager={isManager}
          />
        )}

        {activeTab === 'notas' && (
          <div className="rounded-2xl border border-sp-admin-border bg-sp-admin-card p-5">
            <h2 className="font-bold text-sp-admin-text text-sm mb-3">Notas</h2>
            {campaign.notes !== null && campaign.notes !== '' ? (
              <p className="text-sm text-sp-admin-muted leading-relaxed whitespace-pre-wrap">
                {campaign.notes}
              </p>
            ) : (
              <p className="text-sm text-sp-admin-muted italic">Sin notas.</p>
            )}
          </div>
        )}

        {activeTab === 'deliverables' && (
          <CampaignDeliverables
            campaignId={campaign.id}
            talentId={campaign.talentId}
            deliverables={campaignDeliverables}
            isManager={isManager}
          />
        )}

        {activeTab === 'contratos' && (
          <div className="space-y-6">
            <ContractTab
              campaignId={campaign.id}
              contract={contract}
              isAdmin={isAdmin}
              templates={contractTemplates}
              campaign={campaign}
              contractVars={contractVars}
            />
            {isAdmin && (
              <DealInvoicePanel
                campaignId={campaign.id}
                existingInvoices={issuedInvoices}
                issuers={issuerCompanies}
              />
            )}
          </div>
        )}
      </div>

      {/* Edit drawer */}
      <CampaignDrawer
        campaign={campaign}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        brands={brands}
        talents={talents}
        staffUsers={staffUsers}
        contactsByBrand={contactsByBrand}
        isManager={isManager}
      />
    </div>
  );
}
