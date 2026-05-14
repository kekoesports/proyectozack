'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { StateBadge }         from '@/features/admin/_shared/components/StateBadge';
import { CampaignSummaryCard }   from '@/features/admin/campaigns/components/CampaignSummaryCard';
import { CampaignPayments }      from '@/features/admin/campaigns/components/CampaignPayments';
import { CampaignFiles }         from '@/features/admin/campaigns/components/CampaignFiles';
import { CampaignDrawer }        from '@/features/admin/campaigns/components/CampaignDrawer';
import { CampaignCnmcChecklist } from '@/features/admin/campaigns/components/CampaignCnmcChecklist';
import { CampaignDeliverables }  from '@/features/admin/campaigns/components/CampaignDeliverables';
import { CampaignActivity }      from '@/features/admin/campaigns/components/CampaignActivity';
import { CampaignSplitPanel }    from '@/features/admin/campaigns/components/CampaignSplitPanel';
import { ContractTab }           from '@/features/admin/_shared/components/campaigns/ContractTab';
import { DealInvoicePanel }      from '@/features/admin/_shared/components/campaigns/DealInvoicePanel';
import { CAMPAIGN_STATUS_LABELS } from '@/lib/schemas/campaign';
import { archiveCampaignAction }  from '@/app/admin/(dashboard)/campanas/actions';

import type { Tone }                   from '@/features/admin/_shared/components/StateBadge';
import type { CampaignWithRelations }  from '@/lib/queries/campaigns';
import type { DeliverableWithComments } from '@/lib/queries/deliverables';
import type { CampaignStatus }         from '@/lib/schemas/campaign';
import type { ContractTemplate }       from '@/lib/queries/contractTemplates';
import type {
  ContractWithSigners, FileRecord, Invoice,
  CrmBrandContact, IssuedInvoiceWithRelations, IssuerCompany,
} from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'resumen' | 'pagos' | 'deliverables' | 'contratos' | 'archivos' | 'notas';

const TABS: { id: Tab; label: string }[] = [
  { id: 'resumen',     label: 'Resumen'      },
  { id: 'pagos',       label: 'Pagos'        },
  { id: 'deliverables', label: 'Entregables' },
  { id: 'contratos',   label: 'Contratos'    },
  { id: 'archivos',    label: 'Archivos'     },
  { id: 'notas',       label: 'Actividad'    },
];

const STATUS_TONE: Record<CampaignStatus, Tone> = {
  propuesta:     'neutral',
  negociacion:   'warning',
  aprobada:      'info',
  activa:        'success',
  completada:    'success',
  cancelada:     'danger',
  pendiente_pago: 'warning',
  pagada:        'success',
};

type BrandOption  = { readonly id: number; readonly name: string };
type TalentOption = { readonly id: number; readonly name: string };
type StaffOption  = { readonly id: string; readonly name: string };

type Props = {
  readonly campaign:            CampaignWithRelations;
  readonly campaignFiles:       readonly FileRecord[];
  readonly campaignInvoices:    readonly Invoice[];
  readonly campaignDeliverables: readonly DeliverableWithComments[];
  readonly splits:              readonly { party: string; percentage: number }[]; // safe: CampaignSplit compatible
  readonly isManager:           boolean;
  readonly isAdmin:             boolean;
  readonly brands:              readonly BrandOption[];
  readonly talents:             readonly TalentOption[];
  readonly staffUsers:          readonly StaffOption[];
  readonly contactsByBrand:     Readonly<Record<number, readonly CrmBrandContact[]>>;
  readonly contract:            ContractWithSigners | null;
  readonly contractTemplates:   readonly ContractTemplate[];
  readonly contractVars:        Readonly<Record<string, string>>;
  readonly issuedInvoices:      readonly IssuedInvoiceWithRelations[];
  readonly issuerCompanies:     readonly IssuerCompany[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

function daysRemaining(endDate: string | null): number | null {
  if (!endDate) return null;
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ── KPI mini-card ─────────────────────────────────────────────────────────────

function MiniKpi({
  label, value, accent, sub,
}: {
  readonly label:  string;
  readonly value:  React.ReactNode;
  readonly accent: string;
  readonly sub?:   string;
}): React.ReactElement {
  return (
    <div className="rounded-lg bg-sp-admin-card/80 border border-sp-admin-border/60 px-4 py-2.5 min-w-[110px]">
      <p className="text-[9px] font-bold uppercase tracking-wide text-sp-admin-muted">{label}</p>
      <div className="text-[15px] font-bold mt-0.5 tabular-nums text-sp-admin-text" style={{ color: accent }}>
        {value}
      </div>
      {sub !== undefined && (
        <p className="text-[9px] text-sp-admin-muted mt-0.5">{sub}</p>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function CampaignDetailTabs({
  campaign, campaignFiles, campaignInvoices, campaignDeliverables,
  isManager, isAdmin, brands, talents, staffUsers, contactsByBrand,
  contract, contractTemplates, contractVars, issuedInvoices, issuerCompanies,
  splits,
}: Props): React.ReactElement {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<Tab>('resumen');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  // Días restantes
  const days = useMemo(() => daysRemaining(campaign.endDate), [campaign.endDate]);

  // Estado deliverables
  const delivStats = useMemo(() => {
    const total    = campaignDeliverables.length;
    const approved = campaignDeliverables.filter((d) => d.status === 'approved').length;
    const pending  = campaignDeliverables.filter((d) =>
      d.status === 'pending_submission' || d.status === 'submitted' || d.status === 'internal_review' || d.status === 'brand_review'
    ).length;
    return { total, approved, pending };
  }, [campaignDeliverables]);

  // Tab badge counts
  const tabBadge: Partial<Record<Tab, number>> = {
    deliverables: delivStats.total > 0 ? delivStats.total : 0,
    archivos:     campaignFiles.length,
    contratos:    contract ? 1 : 0,
  };

  async function handleArchive(): Promise<void> {
    if (!confirm('¿Archivar este trato? Podrás restaurarlo más tarde.')) return;
    setArchiving(true);
    const result = await archiveCampaignAction(campaign.id);
    if (result.success) {
      startTransition(() => { router.push('/admin/campanas'); });
    } else {
      setArchiving(false);
      alert(result.error ?? 'Error al archivar');
    }
  }

  return (
    <div>
      {/* ── Breadcrumb ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-[11px] text-sp-admin-muted mb-3">
        <Link href="/admin/campanas" className="hover:text-sp-admin-accent transition-colors">
          ← Tratos
        </Link>
        <span>/</span>
        <span className="text-sp-admin-text font-medium truncate max-w-[300px]">{campaign.name}</span>
      </div>

      {/* ── Sticky header ───────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-sp-admin-bg/95 backdrop-blur-sm border-b border-sp-admin-border -mx-5 px-5 pb-0 pt-2">

        {/* Título + acciones */}
        <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display text-2xl font-black uppercase text-sp-admin-text leading-none truncate">
                {campaign.name}
              </h1>
              <StateBadge tone={STATUS_TONE[campaign.status]}>
                {CAMPAIGN_STATUS_LABELS[campaign.status]}
              </StateBadge>
            </div>

            {/* Subtítulo: marca · influencer · responsable */}
            <div className="flex items-center gap-2 mt-1.5 text-[12px] text-sp-admin-muted flex-wrap">
              {campaign.brand && (
                <Link href={`/admin/brands/${campaign.brandId}`}
                  className="font-medium text-sp-admin-text hover:text-sp-admin-accent transition-colors">
                  {campaign.brand.name}
                </Link>
              )}
              {campaign.talent && (
                <>
                  <span className="opacity-40">·</span>
                  <Link href={`/admin/talents/${campaign.talentId}`}
                    className="hover:text-sp-admin-accent transition-colors">
                    {campaign.talent.name}
                  </Link>
                </>
              )}
              {campaign.responsibleUser && (
                <>
                  <span className="opacity-40">·</span>
                  <span>{campaign.responsibleUser.name}</span>
                </>
              )}
              {campaign.sector && (
                <>
                  <span className="opacity-40">·</span>
                  <span>{campaign.sector}</span>
                </>
              )}
              {campaign.geo && (
                <>
                  <span className="opacity-40">·</span>
                  <span>{campaign.geo}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isManager && (
              <button type="button" onClick={() => void handleArchive()} disabled={archiving}
                className="h-8 px-3 rounded-lg border border-sp-admin-border text-[12px] text-sp-admin-muted hover:text-red-500 hover:border-red-500 transition-colors disabled:opacity-50">
                {archiving ? 'Archivando…' : 'Archivar'}
              </button>
            )}
            <button type="button" onClick={() => setDrawerOpen(true)}
              className="h-8 px-3 rounded-lg bg-sp-admin-accent text-white text-[12px] font-semibold hover:bg-sp-admin-accent/90 transition-colors">
              Editar trato
            </button>
          </div>
        </div>

        {/* ── KPIs rápidos ─────────────────────────────────────── */}
        <div className="flex gap-2 pb-3 overflow-x-auto scrollbar-hide flex-nowrap">
          <MiniKpi
            label="Pago marca"
            value={EUR.format(Number(campaign.amountBrand ?? 0))}
            accent="#8b3aad"
          />
          <MiniKpi
            label="Pago talento"
            value={EUR.format(Number(campaign.amountTalent ?? 0))}
            accent="#5b9bd5"
          />
          <MiniKpi
            label="Comisión"
            value={EUR.format(campaign.commissionAmount)}
            accent={campaign.commissionAmount >= 0 ? '#16a34a' : '#ef4444'}
            {...(Number(campaign.amountBrand ?? 0) > 0
              ? { sub: `${campaign.commissionPct.toFixed(1)}% margen` }
              : {})}
          />
          <MiniKpi
            label="Cobro marca"
            value={campaign.brandPaid === 'si' ? '✓ Cobrado' : campaign.brandPaid === 'parcial' ? 'Parcial' : 'Pendiente'}
            accent={campaign.brandPaid === 'si' ? '#16a34a' : campaign.brandPaid === 'parcial' ? '#f59e0b' : '#ef4444'}
            {...(campaign.totalInvoicedBrand > 0 ? { sub: `${EUR.format(campaign.totalInvoicedBrand)} facturado` } : {})}
          />
          <MiniKpi
            label="Pago talento"
            value={campaign.talentPaid === 'si' ? '✓ Pagado' : campaign.talentPaid === 'parcial' ? 'Parcial' : 'Pendiente'}
            accent={campaign.talentPaid === 'si' ? '#16a34a' : campaign.talentPaid === 'parcial' ? '#f59e0b' : '#ef4444'}
            {...(campaign.totalPaidTalent > 0 ? { sub: `${EUR.format(campaign.totalPaidTalent)} pagado` } : {})}
          />
          {days !== null && (
            <MiniKpi
              label="Días restantes"
              value={days > 0 ? `${days}d` : days === 0 ? 'Hoy' : `${Math.abs(days)}d (vencido)`}
              accent={days > 7 ? '#5b9bd5' : days >= 0 ? '#f59e0b' : '#ef4444'}
            />
          )}
          {delivStats.total > 0 && (
            <MiniKpi
              label="Deliverables"
              value={`${delivStats.approved}/${delivStats.total}`}
              accent={delivStats.approved === delivStats.total ? '#16a34a' : '#f59e0b'}
              sub={delivStats.pending > 0 ? `${delivStats.pending} pendientes` : 'Al día'}
            />
          )}
        </div>

        {/* ── Tab bar ───────────────────────────────────────────── */}
        <div className="flex gap-0 -mb-px">
          {TABS.map((tab) => {
            const badge = tabBadge[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-sp-admin-accent text-sp-admin-accent'
                    : 'border-transparent text-sp-admin-muted hover:text-sp-admin-text'
                }`}
              >
                {tab.label}
                {badge !== undefined && badge > 0 && (
                  <span className={`rounded-full px-1.5 py-0 text-[10px] font-bold leading-4 ${
                    activeTab === tab.id
                      ? 'bg-sp-admin-accent text-white'
                      : 'bg-sp-admin-border text-sp-admin-muted'
                  }`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab content ───────────────────────────────────────────── */}
      <div className="mt-5 space-y-4">

        {activeTab === 'resumen' && (
          <>
            {/* ── Flujo del trato ───────────────────────────────── */}
            <DealFlowTimeline campaign={campaign} contract={contract} invoices={campaignInvoices} />
            <CampaignSummaryCard campaign={campaign} />
            <CampaignCnmcChecklist campaign={campaign} isManager={isManager} />
          </>
        )}

        {activeTab === 'pagos' && (
          <div className="space-y-6">
            <CampaignPayments invoices={campaignInvoices} campaign={campaign} />
            <CampaignSplitPanel
              campaignId={campaign.id}
              splits={splits as import('@/lib/queries/campaignSplits').CampaignSplit[]}
              amountBrand={Number(campaign.amountBrand ?? 0)}
              amountTalent={Number(campaign.amountTalent ?? 0)}
              currency={campaign.currency ?? 'EUR'}
            />
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
          <div className="space-y-5">
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

        {activeTab === 'archivos' && (
          <CampaignFiles
            files={campaignFiles}
            campaignId={campaign.id}
            isManager={isManager}
          />
        )}

        {activeTab === 'notas' && (
          <CampaignActivity
            campaign={campaign}
            campaignDeliverables={campaignDeliverables}
            campaignFiles={campaignFiles}
            campaignInvoices={campaignInvoices}
            contract={contract}
          />
        )}
      </div>

      {/* ── Edit drawer ───────────────────────────────────────────── */}
      <CampaignDrawer
        campaign={campaign}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        brands={brands}
        talents={talents}
        staffUsers={staffUsers}
        contactsByBrand={contactsByBrand}
        isManager={isManager}
        splits={splits as import('@/lib/queries/campaignSplits').CampaignSplit[]}
      />
    </div>
  );
}

// ── Bloque visual "Flujo del trato" ───────────────────────────────────

type FlowStage = {
  readonly id:      string;
  readonly label:   string;
  readonly icon:    string;
  readonly done:    boolean;
  readonly date?:   string | null;
  readonly note?:   string;
  readonly warning?: boolean;
};

function DealFlowTimeline({
  campaign, contract, invoices,
}: {
  readonly campaign: CampaignWithRelations;
  readonly contract: ContractWithSigners | null;
  readonly invoices: readonly Invoice[];
}): React.ReactElement {
  const fmt = (d: string | Date | null | undefined): string => {
    if (!d) return '';
    return new Date(String(d)).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  const activeInvoices = invoices.filter((i) => i.status !== 'anulada');
  const cobradaInvoice = activeInvoices.find((i) => i.status === 'cobrada' || i.status === 'pagada');

  const stages: FlowStage[] = [
    {
      id:    'contrato',
      label: 'Contrato',
      icon:  '📄',
      done:  contract?.status === 'signed',
      date:  contract?.signedAt ? String(contract.signedAt) : null,
      note:  contract
        ? contract.status === 'signed'  ? 'Firmado'
        : contract.status === 'pending_signature' ? 'Pendiente de firma'
        : 'Borrador'
        : 'Sin contrato',
      warning: !contract,
    },
    {
      id:    'factura',
      label: 'Factura',
      icon:  '🧾',
      done:  activeInvoices.length > 0,
      note:  activeInvoices.length === 0
        ? 'Sin factura'
        : `${activeInvoices.length} factura${activeInvoices.length > 1 ? 's' : ''} — ${
            activeInvoices[0]?.status === 'cobrada' ? 'Cobrada'
            : activeInvoices[0]?.status === 'emitida' ? 'Emitida'
            : activeInvoices[0]?.status === 'borrador' ? 'Borrador'
            : activeInvoices[0]?.status ?? ''}`,
      warning: contract?.status === 'signed' && activeInvoices.length === 0,
    },
    {
      id:    'cobro',
      label: 'Cobro marca',
      icon:  '💰',
      done:  campaign.brandPaid === 'si',
      date:  cobradaInvoice?.paidDate ?? null,
      note:  campaign.brandPaid === 'si'
        ? `${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(campaign.totalInvoicedBrand)} cobrados`
        : campaign.brandPaid === 'parcial' ? 'Parcialmente cobrado'
        : 'Pendiente',
      warning: activeInvoices.some((i) => i.status === 'emitida') && campaign.brandPaid === 'no',
    },
    {
      id:    'pago_talento',
      label: 'Pago talento',
      icon:  '💸',
      done:  campaign.talentPaid === 'si',
      note:  campaign.talentPaid === 'si'
        ? `${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(campaign.totalPaidTalent)} pagados`
        : campaign.talentPaid === 'parcial' ? 'Parcialmente pagado'
        : 'Pendiente',
      warning: campaign.brandPaid === 'si' && campaign.talentPaid === 'no' && Number(campaign.amountTalent ?? 0) > 0,
    },
    {
      id:    'cerrado',
      label: 'Cerrado',
      icon:  '✅',
      done:  campaign.status === 'pagada' || (campaign.brandPaid === 'si' && campaign.talentPaid === 'si'),
      note:  campaign.status === 'pagada' ? 'Trato completado' : 'Pendiente',
    },
  ];

  const completedCount = stages.filter((s) => s.done).length;
  const totalCount     = stages.length;
  const pct            = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="rounded-xl border border-sp-admin-border bg-sp-admin-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-sp-admin-border/60 bg-sp-admin-hover/20">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-sp-admin-muted">Flujo del trato</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 rounded-full bg-sp-admin-border overflow-hidden">
            <div className="h-full rounded-full bg-sp-admin-accent transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] font-bold text-sp-admin-muted tabular-nums">{completedCount}/{totalCount}</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="grid grid-cols-5 divide-x divide-sp-admin-border/40">
        {stages.map((stage, i) => (
          <div key={stage.id} className={`px-3 py-3 relative ${stage.warning ? 'bg-amber-50/40' : ''}`}>
            {/* Línea conectora */}
            {i < stages.length - 1 && (
              <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-px h-6 ${
                stage.done ? 'bg-sp-admin-accent' : 'bg-sp-admin-border'
              }`} aria-hidden />
            )}
            {/* Icono */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] shrink-0 ${
                  stage.done
                    ? 'bg-sp-admin-accent/15 border border-sp-admin-accent/40'
                    : stage.warning
                    ? 'bg-amber-100 border border-amber-300'
                    : 'bg-sp-admin-border/60 border border-sp-admin-border'
                }`}
                aria-hidden
              >
                {stage.done ? '✓' : stage.icon}
              </span>
              <p className={`text-[10px] font-bold leading-tight ${
                stage.done ? 'text-sp-admin-accent' : stage.warning ? 'text-amber-700' : 'text-sp-admin-muted'
              }`}>
                {stage.label}
              </p>
            </div>
            <p className={`text-[9px] leading-tight ${stage.warning ? 'text-amber-600 font-semibold' : 'text-sp-admin-muted'}`}>
              {stage.note}
            </p>
            {stage.date && (
              <p className="text-[8px] text-sp-admin-muted/60 mt-0.5 tabular-nums">{fmt(stage.date)}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
