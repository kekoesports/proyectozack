'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  CrmBrandWithDerived,
  CrmBrandContact,
  CrmBrandFollowup,
  CrmBrandFollowupWithBrand,
  CampaignRow,
} from '@/types';
import { FilterBar } from '@/features/admin/_shared/components/FilterBar';
import { EmptyState } from '@/features/admin/_shared/components/EmptyState';
import { BrandFormDrawer } from '@/features/admin/brands/components/BrandFormDrawer';
import {
  BTN_PRIMARY,
  INITIAL_FILTERS,
  SECTOR_OPTIONS,
  GEO_OPTIONS,
  STATUS_OPTIONS,
  hasActiveFilters,
  type FilterState,
} from './BrandsCrmManager.parts';
import { BrandRow } from './BrandsCrmManager.brand-row';

type BrandsCrmManagerProps = {
  readonly brands: readonly CrmBrandWithDerived[];
  readonly contactsByBrand: Readonly<Record<number, readonly CrmBrandContact[]>>;
  readonly followupsByBrand: Readonly<Record<number, readonly CrmBrandFollowup[]>>;
  readonly upcomingFollowups: readonly CrmBrandFollowupWithBrand[];
  readonly campaignsByBrand: Readonly<Record<number, readonly CampaignRow[]>>;
  readonly isManager?: boolean;
  readonly staffUsers?: readonly { id: string; name: string }[];
};

/**
 * Orquestador principal del CRM de marcas: tabla de marcas con filas expandibles
 * (cada fila tiene sub-tabs `info` / `campañas`), barra de filtros sticky,
 * widget de follow-ups en cabecera, drawer de creación/edición de marca y
 * acciones masivas.
 *
 * Sub-componentes en archivos hermanos:
 * - `BrandsCrmManager.parts.tsx` — tipos, constantes, helpers compartidos.
 * - `BrandsCrmManager.brand-row.tsx` — `BrandRow` + sub-tabs por fila.
 * - `BrandsCrmManager.contacts.tsx` — sección "Contactos" del row expandido.
 * - `BrandsCrmManager.followups.tsx` — sección "Seguimientos" del row expandido.
 *
 * @kind client
 * @feature admin/brands
 * @route /admin/brands
 */
export function BrandsCrmManager({
  brands,
  contactsByBrand,
  followupsByBrand,
  upcomingFollowups,
  campaignsByBrand,
  isManager = false,
  staffUsers = [],
}: BrandsCrmManagerProps): React.ReactElement {
  const router = useRouter();
  const canDeleteBrand = !isManager;
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [showArchived, setShowArchived] = useState(false);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<CrmBrandWithDerived | null>(null);

  const openDrawerCreate = (): void => {
    setSelectedBrand(null);
    setDrawerOpen(true);
  };

  const openDrawerEdit = (brand: CrmBrandWithDerived): void => {
    setSelectedBrand(brand);
    setDrawerOpen(true);
  };

  const closeDrawer = (): void => {
    setDrawerOpen(false);
  };

  const handleDrawerSuccess = (): void => {
    router.refresh();
  };

  const overdue = upcomingFollowups.filter((f) => new Date(f.scheduledAt) < new Date());
  const upcoming = upcomingFollowups.filter((f) => new Date(f.scheduledAt) >= new Date());

  // Client-side filtering
  const filteredBrands = brands.filter((brand) => {
    if (!showArchived && brand.status === 'archivada') return false;
    if (filters.sector && brand.sector !== filters.sector) return false;
    if (filters.geo && brand.geo !== filters.geo) return false;
    if (filters.status && brand.status !== filters.status) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!brand.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filtersActive = hasActiveFilters(filters, showArchived);

  const resetFilters = (): void => {
    setFilters(INITIAL_FILTERS);
    setShowArchived(false);
  };

  return (
    <div className="space-y-6">
      {/* Follow-up widget */}
      {upcomingFollowups.length > 0 && (
        <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border p-5">
          <h3 className="text-xs uppercase tracking-wider font-semibold text-sp-admin-muted mb-3">
            Próximos seguimientos
          </h3>
          {overdue.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] uppercase tracking-wider text-red-400 font-semibold mb-2">Vencidos</p>
              <div className="space-y-1.5">
                {overdue.map((f) => (
                  <FollowupWidgetRow key={f.id} followup={f} isOverdue />
                ))}
              </div>
            </div>
          )}
          {upcoming.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-sp-admin-muted font-semibold mb-2">Próximos 30 días</p>
              <div className="space-y-1.5">
                {upcoming.map((f) => (
                  <FollowupWidgetRow key={f.id} followup={f} isOverdue={false} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-sp-admin-muted">
          {filteredBrands.length} {filteredBrands.length === 1 ? 'marca' : 'marcas'}
          {filtersActive && <span className="ml-1 text-sp-admin-muted/60">(filtradas de {brands.length})</span>}
        </p>
        <button
          type="button"
          onClick={openDrawerCreate}
          className={BTN_PRIMARY}
        >
          + Nueva marca
        </button>
      </div>

      {/* FilterBar */}
      <FilterBar>
        <FilterBar.Search
          id="brands-search"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          placeholder="Buscar por nombre…"
        />
        <FilterBar.Select
          id="brands-sector"
          label="Sector"
          value={filters.sector}
          onChange={(e) => setFilters((f) => ({ ...f, sector: e.target.value }))}
          options={SECTOR_OPTIONS}
        />
        <FilterBar.Select
          id="brands-geo"
          label="Geo"
          value={filters.geo}
          onChange={(e) => setFilters((f) => ({ ...f, geo: e.target.value }))}
          options={GEO_OPTIONS}
        />
        <FilterBar.Select
          id="brands-status"
          label="Estado"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          options={STATUS_OPTIONS}
        />
        <label className="flex flex-col gap-1 min-w-0 self-end pb-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-sp-admin-muted">Archivadas</span>
          <button
            type="button"
            role="switch"
            aria-checked={showArchived}
            onClick={() => setShowArchived((v) => !v)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${showArchived ? 'bg-sp-admin-accent' : 'bg-sp-admin-border'}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${showArchived ? 'translate-x-4' : 'translate-x-0.5'}`}
            />
          </button>
        </label>
        <FilterBar.Reset active={filtersActive} onReset={resetFilters} />
      </FilterBar>

      {brands.length === 0 ? (
        <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
          <EmptyState
            variant="no-data"
            title="Sin marcas todavía"
            description="Crea la primera marca para empezar tu CRM."
            action={
              <button
                type="button"
                onClick={openDrawerCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-sp-admin-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                + Nueva marca
              </button>
            }
          />
        </div>
      ) : filteredBrands.length === 0 ? (
        <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
          <EmptyState
            variant="no-results"
            title="Sin resultados"
            description="Prueba con otros filtros o limpia la búsqueda."
            action={
              <button type="button" onClick={resetFilters} className="text-xs font-semibold text-sp-admin-accent hover:underline">
                Limpiar filtros
              </button>
            }
          />
        </div>
      ) : (
        <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sp-admin-border bg-sp-admin-bg/50">
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Marca</th>
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Tipo</th>
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Estado</th>
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Follow-up</th>
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Sector</th>
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Owner</th>
                <th className="text-left px-6 py-3 font-semibold text-sp-admin-muted text-[11px] uppercase tracking-wider">Contacto principal</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredBrands.map((brand) => {
                const isExpanded = expandedId === brand.id;
                const contacts = contactsByBrand[brand.id] ?? [];
                const followups = followupsByBrand[brand.id] ?? [];
                const brandCampaigns = campaignsByBrand[brand.id] ?? [];
                return (
                  <BrandRow
                    key={brand.id}
                    brand={brand}
                    contacts={contacts}
                    followups={followups}
                    campaigns={brandCampaigns}
                    isExpanded={isExpanded}
                    canDelete={canDeleteBrand}
                    isManager={isManager}
                    staffUsers={staffUsers}
                    onToggleExpand={() => {
                      setExpandedId(isExpanded ? null : brand.id);
                    }}
                    onOpenDrawer={() => openDrawerEdit(brand)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <BrandFormDrawer
        brand={selectedBrand}
        isOpen={drawerOpen}
        onClose={closeDrawer}
        staffUsers={staffUsers}
        isManager={isManager}
        onSuccess={handleDrawerSuccess}
      />
    </div>
  );
}

function FollowupWidgetRow({
  followup,
  isOverdue,
}: {
  readonly followup: CrmBrandFollowupWithBrand;
  readonly isOverdue: boolean;
}): React.ReactElement {
  const date = new Date(followup.scheduledAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  return (
    <div className={`flex items-start gap-3 rounded-xl px-3 py-2 text-xs ${isOverdue ? 'bg-red-500/10' : 'bg-sp-admin-bg'}`}>
      <span className={`font-mono font-semibold shrink-0 ${isOverdue ? 'text-red-400' : 'text-sp-admin-muted'}`}>{date}</span>
      <span className="font-semibold text-sp-admin-text shrink-0">{followup.brandName}</span>
      <span className="text-sp-admin-muted truncate">{followup.note}</span>
    </div>
  );
}
