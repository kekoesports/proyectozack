'use client';

import { useState, useTransition } from 'react';
import { deleteBrandAction } from '@/app/admin/(dashboard)/brands/crm-actions';
import type {
  CrmBrandWithDerived,
  CrmBrandContact,
  CrmBrandFollowup,
  CampaignRow,
} from '@/types';
import {
  SECTOR_LABELS,
  GEO_LABELS,
  type CrmBrandSector,
  type CrmBrandGeo,
} from '@/lib/schemas/crmBrand';
import { StateBadge } from '@/features/admin/_shared/components/StateBadge';
import { BrandCampaignsTab } from '@/features/admin/brands/components/BrandCampaignsTab';
import {
  STATUS_LABELS,
  STATUS_TONE,
  FOLLOWUP_TONE,
  FOLLOWUP_LABEL,
  TIPO_LABELS,
  LABEL,
  BTN_GHOST,
  buildBrandSummary,
  type BrandExpandTab,
} from './BrandsCrmManager.parts';
import { ContactsList } from './BrandsCrmManager.contacts';
import { FollowupsList } from './BrandsCrmManager.followups';

type BrandRowProps = {
  readonly brand: CrmBrandWithDerived;
  readonly contacts: readonly CrmBrandContact[];
  readonly followups: readonly CrmBrandFollowup[];
  readonly campaigns: readonly CampaignRow[];
  readonly isExpanded: boolean;
  readonly canDelete: boolean;
  readonly isManager: boolean;
  readonly staffUsers: readonly { id: string; name: string }[];
  readonly onToggleExpand: () => void;
  readonly onOpenDrawer: () => void;
};

export function BrandRow({ brand, contacts, followups, campaigns, isExpanded, canDelete, isManager, staffUsers, onToggleExpand, onOpenDrawer }: BrandRowProps): React.ReactElement {
  const [isPending, startTransition] = useTransition();
  const [showAddContact, setShowAddContact] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const _primary = brand.primaryContact;

  const onDelete = (): void => {
    if (!confirm(`¿Eliminar la marca "${brand.name}" y todos sus contactos?`)) return;
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteBrandAction(brand.id);
      if (result.error) setDeleteError(result.error);
    });
  };

  const pendingFollowups = followups.filter((f) => !f.completedAt).length;

  return (
    <>
      <tr
        className={`border-b border-sp-admin-border/50 last:border-0 hover:bg-sp-admin-hover transition-colors cursor-pointer ${isExpanded ? 'bg-sp-admin-hover/40' : ''}`}
        onClick={onToggleExpand}
      >
        <td className="px-6 py-4 font-medium text-sp-admin-text">
          <div className="flex items-center gap-2">
            <span className={`text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▸</span>
            <span>{brand.name}</span>
            {pendingFollowups > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                {pendingFollowups} seguim.
              </span>
            )}
          </div>
        </td>
        <td className="px-6 py-4">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt={brand.name} className="h-6 w-auto max-w-[60px] object-contain" />
          ) : (
            <span className="text-[10px] text-sp-admin-muted/40">—</span>
          )}
        </td>
        <td className="px-6 py-4 text-sp-admin-muted text-xs">
          {brand.tipo ? TIPO_LABELS[brand.tipo] ?? brand.tipo : '—'}
        </td>
        <td className="px-6 py-4">
          <StateBadge tone={STATUS_TONE[brand.status]}>
            {STATUS_LABELS[brand.status]}
          </StateBadge>
        </td>
        <td className="px-6 py-4">
          <StateBadge tone={FOLLOWUP_TONE[brand.followupStatus]} variant="dot">
            {FOLLOWUP_LABEL[brand.followupStatus]}
          </StateBadge>
        </td>
        <td className="px-6 py-4 text-sp-admin-muted text-xs">
          {brand.sector ? (SECTOR_LABELS[brand.sector as CrmBrandSector] ?? brand.sector) : '—'}
        </td>
        <td className="px-6 py-4 text-right whitespace-nowrap">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenDrawer(); }}
            className={BTN_GHOST}
          >
            Editar
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              disabled={isPending}
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors cursor-pointer"
            >
              Borrar
            </button>
          )}
        </td>
      </tr>
      {deleteError && (
        <tr>
          <td colSpan={7} className="px-6 pb-2">
            <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-1.5">{deleteError}</p>
          </td>
        </tr>
      )}
      {isExpanded && (
        <ExpandedBrandRow
          brand={brand}
          contacts={contacts}
          followups={followups}
          campaigns={campaigns}
          showAddContact={showAddContact}
          isManager={isManager}
          staffUsers={staffUsers}
          onToggleAddContact={() => setShowAddContact((v) => !v)}
        />
      )}
    </>
  );
}

type ExpandedBrandRowProps = {
  readonly brand: CrmBrandWithDerived;
  readonly contacts: readonly CrmBrandContact[];
  readonly followups: readonly CrmBrandFollowup[];
  readonly campaigns: readonly CampaignRow[];
  readonly showAddContact: boolean;
  readonly isManager: boolean;
  readonly staffUsers: readonly { id: string; name: string }[];
  readonly onToggleAddContact: () => void;
};

function ExpandedBrandRow({
  brand,
  contacts,
  followups,
  campaigns,
  showAddContact,
  isManager,
  staffUsers,
  onToggleAddContact,
}: ExpandedBrandRowProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<BrandExpandTab>('info');
  const summary = buildBrandSummary(campaigns);

  return (
    <tr className="bg-sp-admin-bg/40">
      <td colSpan={7} className="px-6 py-5">
        {/* Sub-tab bar */}
        <div className="flex gap-1 border-b border-sp-admin-border mb-4">
          {([
            { id: 'info' as const, label: 'Info & Contactos' },
            { id: 'campanas' as const, label: `Campañas (${campaigns.length})` },
          ] satisfies { id: BrandExpandTab; label: string }[]).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-sp-admin-accent text-sp-admin-accent'
                  : 'border-transparent text-sp-admin-muted hover:text-sp-admin-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'info' && (
          <div className="space-y-4">
            <BrandDetails brand={brand} />
            <ContactsList
              brandId={brand.id}
              contacts={contacts}
              showAddForm={showAddContact}
              isManager={isManager}
              onToggleAdd={onToggleAddContact}
            />
            <FollowupsList
              brandId={brand.id}
              followups={followups}
              isManager={isManager}
              staffUsers={staffUsers}
            />
          </div>
        )}

        {activeTab === 'campanas' && (
          <BrandCampaignsTab
            brandId={brand.id}
            campaigns={campaigns}
            summary={summary}
          />
        )}
      </td>
    </tr>
  );
}

function BrandDetails({ brand }: { readonly brand: CrmBrandWithDerived }): React.ReactElement {
  const hasSocial = brand.telegram ?? brand.discord ?? brand.whatsapp;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
      <Field label="Manager" value={brand.manager} />
      <Field label="Web" value={brand.website} link />
      <Field label="Geo" value={brand.geo ? (GEO_LABELS[brand.geo as CrmBrandGeo] ?? brand.geo) : null} />
      <Field label="País" value={brand.country} />
      <Field label="Creado" value={new Date(brand.createdAt).toLocaleDateString('es-ES')} />
      {hasSocial && (
        <div className="flex gap-4 col-span-1 md:col-span-3">
          {brand.telegram  && <Field label="Telegram"  value={brand.telegram} />}
          {brand.discord   && <Field label="Discord"   value={brand.discord} />}
          {brand.whatsapp  && <Field label="WhatsApp"  value={brand.whatsapp} />}
        </div>
      )}
      {brand.notes && (
        <div className="col-span-2 md:col-span-4">
          <p className={LABEL}>Notas</p>
          <p className="text-sp-admin-text whitespace-pre-wrap">{brand.notes}</p>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, link = false }: { readonly label: string; readonly value: string | null | undefined; readonly link?: boolean }): React.ReactElement {
  return (
    <div>
      <p className={LABEL}>{label}</p>
      {value ? (
        link ? (
          <a href={value} target="_blank" rel="noreferrer" className="text-sp-admin-accent hover:underline break-all">{value}</a>
        ) : (
          <p className="text-sp-admin-text">{value}</p>
        )
      ) : (
        <p className="text-sp-admin-muted text-xs italic">—</p>
      )}
    </div>
  );
}
