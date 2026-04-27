'use client';

import { useState } from 'react';

import { StateBadge } from '@/features/admin/_shared/components/StateBadge';
import { EmptyState } from '@/features/admin/_shared/components/EmptyState';
import { CampaignFilters, EMPTY_FILTERS } from '@/features/admin/campaigns/components/CampaignFilters';
import { CampaignDrawer } from '@/features/admin/campaigns/components/CampaignDrawer';
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_ACTION_LABELS,
  computeCampaignDerived,
} from '@/lib/schemas/campaign';

import type { CampaignRow } from '@/types';
import type { CampaignFilterState } from '@/features/admin/campaigns/components/CampaignFilters';
import type { CrmBrandContact } from '@/types';

import {
  EUR,
  STATUS_TONE,
  applyFilters,
  type BrandOption,
  type StaffOption,
  type TalentOption,
} from './CampaignsList.parts';

type Props = {
  readonly campaigns: readonly CampaignRow[];
  readonly isManager: boolean;
  readonly brands: readonly BrandOption[];
  readonly talents: readonly TalentOption[];
  readonly staffUsers: readonly StaffOption[];
  readonly contactsByBrand: Readonly<Record<number, readonly CrmBrandContact[]>>;
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Listado principal de campañas con filtros, ordenación y acceso al drawer de creación/edición.
 *
 * @kind client
 * @feature admin/campaigns
 * @route /admin/campanas
 */
export function CampaignsList({
  campaigns,
  isManager,
  brands,
  talents,
  staffUsers,
  contactsByBrand,
}: Props): React.ReactElement {
  const [filters, setFilters] = useState<CampaignFilterState>(EMPTY_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<CampaignRow | null>(null);

  // Build lookup maps for filter display
  const brandMap = new Map(brands.map((b) => [b.id, b.name]));
  const talentMap = new Map(talents.map((t) => [t.id, t.name]));
  const staffMap = new Map(staffUsers.map((u) => [u.id, u.name]));

  const filtered = applyFilters(campaigns, filters, brandMap, talentMap);

  function openCreate(): void {
    setSelected(null);
    setDrawerOpen(true);
  }

  function openEdit(c: CampaignRow): void {
    setSelected(c);
    setDrawerOpen(true);
  }

  function closeDrawer(): void {
    setDrawerOpen(false);
    setSelected(null);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl font-black uppercase text-sp-admin-text">
          Campañas
        </h1>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-sp-admin-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          + Nueva campaña
        </button>
      </div>

      {/* Filters */}
      <CampaignFilters
        filters={filters}
        onChange={setFilters}
        brands={brands}
        talents={talents}
        staffUsers={staffUsers}
      />

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
          <EmptyState
            variant={filters.search !== '' || filters.status !== '' ? 'no-results' : 'no-data'}
            title={
              filters.search !== '' || filters.status !== ''
                ? 'Sin resultados'
                : 'No hay campañas'
            }
            description={
              filters.search !== '' || filters.status !== ''
                ? 'Prueba a cambiar los filtros.'
                : 'Crea tu primera campaña con el botón de arriba.'
            }
          />
        </div>
      ) : (
        <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-sp-admin-border bg-sp-admin-bg/50">
                {[
                  'Nombre',
                  'Marca',
                  'Influencer',
                  'Estado',
                  'Tipo',
                  'Pago marca',
                  'Pago talento',
                  'Comisión',
                  'Responsable',
                  '',
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const { tone, variant } = STATUS_TONE[c.status];
                const derived = computeCampaignDerived({
                  amountBrand: c.amountBrand,
                  amountTalent: c.amountTalent,
                });
                const isArchived = c.archivedAt !== null;

                return (
                  <tr
                    key={c.id}
                    onClick={() => openEdit(c)}
                    className={[
                      'border-b border-sp-admin-border/50 last:border-0 cursor-pointer transition-colors',
                      isArchived
                        ? 'opacity-50 hover:opacity-70 hover:bg-sp-admin-hover'
                        : 'hover:bg-sp-admin-hover',
                    ].join(' ')}
                  >
                    {/* Nombre */}
                    <td className="px-4 py-3 font-medium text-sp-admin-text whitespace-nowrap max-w-[180px] truncate">
                      {c.name}
                      {isArchived && (
                        <span className="ml-1.5 text-[10px] text-sp-admin-muted">(archivada)</span>
                      )}
                    </td>

                    {/* Marca */}
                    <td className="px-4 py-3 text-sp-admin-muted whitespace-nowrap">
                      {brandMap.get(c.brandId) ?? '—'}
                    </td>

                    {/* Influencer */}
                    <td className="px-4 py-3 text-sp-admin-muted whitespace-nowrap">
                      {talentMap.get(c.talentId) ?? '—'}
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StateBadge
                        tone={tone}
                        {...(variant !== undefined ? { variant } : {})}
                      >
                        {CAMPAIGN_STATUS_LABELS[c.status]}
                      </StateBadge>
                    </td>

                    {/* Tipo */}
                    <td className="px-4 py-3 text-sp-admin-muted whitespace-nowrap text-xs">
                      {CAMPAIGN_ACTION_LABELS[c.actionType]}
                    </td>

                    {/* Pago marca */}
                    <td className="px-4 py-3 text-sp-admin-text whitespace-nowrap tabular-nums">
                      {EUR.format(Number(c.amountBrand))}
                    </td>

                    {/* Pago talento */}
                    <td className="px-4 py-3 text-sp-admin-text whitespace-nowrap tabular-nums">
                      {EUR.format(Number(c.amountTalent))}
                    </td>

                    {/* Comisión */}
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      <span className="text-sp-admin-text">
                        {EUR.format(derived.commissionAmount)}
                      </span>
                      <span className="ml-1 text-[11px] text-sp-admin-muted">
                        ({derived.commissionPct.toFixed(1)}%)
                      </span>
                    </td>

                    {/* Responsable */}
                    <td className="px-4 py-3 text-sp-admin-muted whitespace-nowrap text-xs">
                      {c.responsibleUserId ? (staffMap.get(c.responsibleUserId) ?? '—') : '—'}
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(c);
                        }}
                        className="text-xs text-sp-admin-muted hover:text-sp-admin-text transition-colors"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawer */}
      <CampaignDrawer
        campaign={selected}
        isOpen={drawerOpen}
        onClose={closeDrawer}
        brands={brands}
        talents={talents}
        staffUsers={staffUsers}
        contactsByBrand={contactsByBrand}
        isManager={isManager}
      />
    </div>
  );
}
