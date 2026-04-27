'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  deleteBrandAction,
  deleteContactAction,
  completeFollowupAction,
  deleteFollowupAction,
} from '@/app/admin/(dashboard)/brands/crm-actions';
import type {
  CrmBrandWithDerived,
  CrmBrandContact,
  CrmBrandFollowup,
  CrmBrandFollowupWithBrand,
  CrmBrandStatus,
  BrandFollowupDerivedStatus,
  CampaignRow,
} from '@/types';
import {
  CRM_BRAND_STATUSES,
  CRM_BRAND_SECTORES,
  CRM_BRAND_GEOS,
  SECTOR_LABELS,
  GEO_LABELS,
  CRM_FOLLOWUP_CHANNELS,
  type CrmBrandSector,
  type CrmBrandGeo,
  type CrmFollowupStatus,
} from '@/lib/schemas/crmBrand';
import { StateBadge } from '@/components/admin/ui/StateBadge';
import { FilterBar } from '@/components/admin/ui/FilterBar';
import { EmptyState } from '@/components/admin/ui/EmptyState';
import { BrandFormDrawer } from '@/components/admin/brands/BrandFormDrawer';
import { BrandContactForm } from '@/components/admin/brands/BrandContactForm';
import { BrandFollowupForm } from '@/components/admin/brands/BrandFollowupForm';
import { BrandCampaignsTab } from '@/components/admin/brands/BrandCampaignsTab';
import type { Tone } from '@/components/admin/ui/StateBadge';
import type { CampaignBrandSummary } from '@/lib/queries/campaigns';

const STATUS_LABELS: Record<CrmBrandStatus, string> = {
  lead: 'Lead',
  contactada: 'Contactada',
  en_negociacion: 'En negociación',
  activa: 'Activa',
  pausada: 'Pausada',
  cerrada: 'Cerrada',
  no_interesa: 'No interesa',
  archivada: 'Archivada',
};

const STATUS_TONE: Record<CrmBrandStatus, Tone> = {
  lead: 'info',
  contactada: 'warning',
  en_negociacion: 'warning',
  activa: 'success',
  pausada: 'neutral',
  cerrada: 'neutral',
  no_interesa: 'neutral',
  archivada: 'neutral',
};

const FOLLOWUP_TONE: Record<BrandFollowupDerivedStatus, Tone> = {
  sin_followup: 'neutral',
  pendiente: 'info',
  hoy: 'warning',
  vencido: 'danger',
};

const FOLLOWUP_LABEL: Record<BrandFollowupDerivedStatus, string> = {
  sin_followup: 'Sin follow-up',
  pendiente: 'Pendiente',
  hoy: 'Hoy',
  vencido: 'Vencido',
};

const TIPO_LABELS: Record<string, string> = {
  agencia: 'Agencia',
  marca: 'Marca',
};

type BrandsCrmManagerProps = {
  readonly brands: readonly CrmBrandWithDerived[];
  readonly contactsByBrand: Readonly<Record<number, readonly CrmBrandContact[]>>;
  readonly followupsByBrand: Readonly<Record<number, readonly CrmBrandFollowup[]>>;
  readonly upcomingFollowups: readonly CrmBrandFollowupWithBrand[];
  readonly campaignsByBrand: Readonly<Record<number, readonly CampaignRow[]>>;
  readonly isManager?: boolean;
  readonly staffUsers?: readonly { id: string; name: string }[];
};

const LABEL = 'block text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-1';
const BTN_PRIMARY = 'px-4 py-2 rounded-full text-sm font-bold text-sp-admin-bg bg-sp-admin-accent hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer';
const BTN_GHOST = 'px-3 py-1.5 rounded-full text-xs font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors cursor-pointer';

type FilterState = {
  sector: string;
  geo: string;
  status: string;
  search: string;
};

const INITIAL_FILTERS: FilterState = { sector: '', geo: '', status: '', search: '' };

const SECTOR_OPTIONS = [
  { value: '', label: 'Todos los sectores' },
  ...CRM_BRAND_SECTORES.map((s) => ({ value: s, label: SECTOR_LABELS[s] })),
];

const GEO_OPTIONS = [
  { value: '', label: 'Todas las geos' },
  ...CRM_BRAND_GEOS.map((g) => ({ value: g, label: GEO_LABELS[g] })),
];

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  ...CRM_BRAND_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
];

function hasActiveFilters(f: FilterState, showArchived: boolean): boolean {
  return f.sector !== '' || f.geo !== '' || f.status !== '' || f.search !== '' || showArchived;
}

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
        <div className="rounded-2xl border border-dashed border-sp-admin-border p-12 text-center">
          <p className="text-sm text-sp-admin-muted">
            No hay marcas registradas todavía. Crea la primera para empezar tu CRM.
          </p>
        </div>
      ) : filteredBrands.length === 0 ? (
        <div className="rounded-2xl bg-sp-admin-card border border-sp-admin-border overflow-hidden">
          <EmptyState
            variant="no-results"
            title="Sin resultados"
            description="Prueba con otros filtros o limpia la búsqueda actual."
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

function BrandRow({ brand, contacts, followups, campaigns, isExpanded, canDelete, isManager, staffUsers, onToggleExpand, onOpenDrawer }: BrandRowProps): React.ReactElement {
  const [isPending, startTransition] = useTransition();
  const [showAddContact, setShowAddContact] = useState(false);
  const primary = brand.primaryContact;

  const onDelete = (): void => {
    if (!confirm(`¿Eliminar la marca "${brand.name}" y todos sus contactos?`)) return;
    startTransition(async () => {
      await deleteBrandAction(brand.id);
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
        <td className="px-6 py-4 text-sp-admin-muted">{brand.ownerName ?? '—'}</td>
        <td className="px-6 py-4 text-sp-admin-muted">
          {primary ? (
            <div className="flex flex-col">
              <span className="text-sp-admin-text font-medium">{primary.name}</span>
              {primary.email && <span className="text-xs">{primary.email}</span>}
            </div>
          ) : (
            <span className="text-xs italic">Sin contacto principal</span>
          )}
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

type BrandExpandTab = 'info' | 'campanas';

function buildBrandSummary(campaigns: readonly CampaignRow[]): CampaignBrandSummary {
  let totalAmountBrand = 0;
  let totalAmountTalent = 0;
  for (const c of campaigns) {
    totalAmountBrand += Number(c.amountBrand);
    totalAmountTalent += Number(c.amountTalent);
  }
  return {
    campaigns: campaigns as CampaignRow[],
    totalAmountBrand,
    totalCommission: totalAmountBrand - totalAmountTalent,
    count: campaigns.length,
  };
}

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
      <td colSpan={8} className="px-6 py-5">
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
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
      <Field label="Razón social" value={brand.legalName} />
      <Field label="Web" value={brand.website} link />
      <Field label="Geo" value={brand.geo ? (GEO_LABELS[brand.geo as CrmBrandGeo] ?? brand.geo) : null} />
      <Field label="País" value={brand.country} />
      <Field label="Creado" value={new Date(brand.createdAt).toLocaleDateString('es-ES')} />
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

type ContactsListProps = {
  readonly brandId: number;
  readonly contacts: readonly CrmBrandContact[];
  readonly showAddForm: boolean;
  readonly isManager: boolean;
  readonly onToggleAdd: () => void;
};

function ContactsList({ brandId, contacts, showAddForm, isManager, onToggleAdd }: ContactsListProps): React.ReactElement {
  const router = useRouter();

  const handleSuccess = (): void => {
    onToggleAdd();
    router.refresh();
  };

  return (
    <div className="rounded-xl bg-sp-admin-card border border-sp-admin-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs uppercase tracking-wider font-semibold text-sp-admin-muted">
          Contactos ({contacts.length})
        </h4>
        <button type="button" onClick={onToggleAdd} className={BTN_GHOST}>
          {showAddForm ? 'Cancelar' : '+ Añadir contacto'}
        </button>
      </div>
      {showAddForm && (
        <BrandContactForm
          brandId={brandId}
          contact={null}
          isManager={isManager}
          onSuccess={handleSuccess}
          onCancel={onToggleAdd}
        />
      )}
      {contacts.length === 0 && !showAddForm ? (
        <p className="text-xs italic text-sp-admin-muted py-2">Sin contactos todavía.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          {contacts.map((c) => (
            <ContactCard key={c.id} contact={c} brandId={brandId} isManager={isManager} />
          ))}
        </div>
      )}
    </div>
  );
}

function ContactCard({
  contact,
  brandId,
  isManager,
}: {
  readonly contact: CrmBrandContact;
  readonly brandId: number;
  readonly isManager: boolean;
}): React.ReactElement {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleEditSuccess = (): void => {
    setEditing(false);
    router.refresh();
  };

  if (editing) {
    return (
      <BrandContactForm
        brandId={brandId}
        contact={contact}
        isManager={isManager}
        onSuccess={handleEditSuccess}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const onDelete = (): void => {
    if (!confirm(`¿Eliminar contacto "${contact.name}"?`)) return;
    startTransition(async () => {
      await deleteContactAction(contact.id, brandId);
      router.refresh();
    });
  };

  return (
    <div className="rounded-xl bg-sp-admin-bg border border-sp-admin-border p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sp-admin-text text-sm">{contact.name}</p>
            {contact.isPrimary && (
              <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-sp-admin-accent text-sp-admin-bg">
                Principal
              </span>
            )}
          </div>
          {contact.role && <p className="text-xs text-sp-admin-muted">{contact.role}</p>}
          {contact.country && (
            <p className="text-[10px] text-sp-admin-muted/70 uppercase tracking-wider">{contact.country}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="px-2 py-1 rounded text-[10px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover cursor-pointer"
          >
            Editar
          </button>
          {!isManager && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isPending}
              className="px-2 py-1 rounded text-[10px] font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50 cursor-pointer"
            >
              Borrar
            </button>
          )}
        </div>
      </div>
      <div className="space-y-1 text-xs text-sp-admin-muted">
        {contact.email && <p>📧 {contact.email}</p>}
        {contact.phone && <p>📞 {contact.phone}</p>}
        {contact.telegram && <p>✈️ {contact.telegram}</p>}
        {contact.discord && <p>🎮 {contact.discord}</p>}
        {contact.whatsapp && <p>💬 {contact.whatsapp}</p>}
        {contact.linkedin && (
          <p>
            🔗{' '}
            <a
              href={contact.linkedin}
              target="_blank"
              rel="noreferrer"
              className="text-sp-admin-accent hover:underline"
            >
              LinkedIn
            </a>
          </p>
        )}
        {contact.notes && (
          <p className="mt-1 text-sp-admin-muted/80 italic line-clamp-2">{contact.notes}</p>
        )}
      </div>
    </div>
  );
}

// --- Follow-ups ---

const CHANNEL_LABELS: Record<(typeof CRM_FOLLOWUP_CHANNELS)[number], string> = {
  email: 'Email',
  telegram: 'Telegram',
  discord: 'Discord',
  whatsapp: 'WhatsApp',
  reunion: 'Reunión',
  llamada: 'Llamada',
  otro: 'Otro',
};

const FOLLOWUP_STATUS_LABELS: Record<CrmFollowupStatus, string> = {
  pendiente: 'Pendiente',
  hecho: 'Hecho',
  vencido: 'Vencido',
};

const FOLLOWUP_STATUS_TONE: Record<CrmFollowupStatus, Tone> = {
  pendiente: 'warning',
  hecho: 'success',
  vencido: 'danger',
};

type FollowupsListProps = {
  readonly brandId: number;
  readonly followups: readonly CrmBrandFollowup[];
  readonly isManager: boolean;
  readonly staffUsers: readonly { id: string; name: string }[];
};

function FollowupsList({ brandId, followups, isManager, staffUsers }: FollowupsListProps): React.ReactElement {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const pending = followups.filter((f) => !f.completedAt);
  const completed = followups.filter((f) => f.completedAt);

  const handleCreateSuccess = (): void => {
    setShowForm(false);
    router.refresh();
  };

  return (
    <div className="rounded-xl bg-sp-admin-card border border-sp-admin-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs uppercase tracking-wider font-semibold text-sp-admin-muted">
          Seguimientos ({pending.length} pendientes)
        </h4>
        <button type="button" onClick={() => setShowForm((v) => !v)} className={BTN_GHOST}>
          {showForm ? 'Cancelar' : '+ Añadir seguimiento'}
        </button>
      </div>

      {showForm && (
        <BrandFollowupForm
          brandId={brandId}
          followup={null}
          staffUsers={staffUsers}
          isManager={isManager}
          onSuccess={handleCreateSuccess}
          onCancel={() => setShowForm(false)}
        />
      )}

      {followups.length === 0 && !showForm ? (
        <p className="text-xs italic text-sp-admin-muted py-2">Sin seguimientos todavía.</p>
      ) : (
        <div className="space-y-2 mt-2">
          {pending.map((f) => (
            <FollowupItem key={f.id} followup={f} brandId={brandId} isManager={isManager} staffUsers={staffUsers} />
          ))}
          {completed.length > 0 && (
            <details className="mt-2">
              <summary className="text-[10px] uppercase tracking-wider text-sp-admin-muted cursor-pointer select-none">
                Completados ({completed.length})
              </summary>
              <div className="space-y-2 mt-2">
                {completed.map((f) => (
                  <FollowupItem key={f.id} followup={f} brandId={brandId} isManager={isManager} staffUsers={staffUsers} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function FollowupItem({
  followup,
  brandId,
  isManager,
  staffUsers,
}: {
  readonly followup: CrmBrandFollowup;
  readonly brandId: number;
  readonly isManager: boolean;
  readonly staffUsers: readonly { id: string; name: string }[];
}): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const isDone = !!followup.completedAt;
  const isOverdue = !isDone && new Date(followup.scheduledAt) < new Date();

  const handleEditSuccess = (): void => {
    setEditing(false);
    router.refresh();
  };

  if (editing) {
    return (
      <BrandFollowupForm
        brandId={brandId}
        followup={followup}
        staffUsers={staffUsers}
        isManager={isManager}
        onSuccess={handleEditSuccess}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const onComplete = (): void => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', String(followup.id));
      fd.set('brandId', String(brandId));
      await completeFollowupAction({}, fd);
      router.refresh();
    });
  };

  const onDelete = (): void => {
    if (!confirm('¿Eliminar este seguimiento?')) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', String(followup.id));
      fd.set('brandId', String(brandId));
      await deleteFollowupAction({}, fd);
      router.refresh();
    });
  };

  const date = new Date(followup.scheduledAt).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div
      className={`rounded-xl px-3 py-2.5 text-xs border border-sp-admin-border ${
        isDone ? 'opacity-50' : isOverdue ? 'bg-red-500/10' : 'bg-sp-admin-bg'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`font-mono shrink-0 ${isOverdue ? 'text-red-400' : 'text-sp-admin-muted'}`}>
          {date}
        </span>
        <div className="flex-1 min-w-0">
          <span className={isDone ? 'line-through text-sp-admin-muted' : 'text-sp-admin-text'}>
            {followup.note}
          </span>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {followup.channel && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sp-admin-border/50 text-sp-admin-muted">
                {CHANNEL_LABELS[followup.channel]}
              </span>
            )}
            {followup.status && (
              <StateBadge tone={FOLLOWUP_STATUS_TONE[followup.status as CrmFollowupStatus]}>
                {FOLLOWUP_STATUS_LABELS[followup.status as CrmFollowupStatus]}
              </StateBadge>
            )}
            {followup.nextAction && (
              <span className="text-[10px] text-sp-admin-muted italic truncate">
                → {followup.nextAction}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={isPending}
            className="px-2 py-0.5 rounded text-[10px] font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover disabled:opacity-50 cursor-pointer"
          >
            Editar
          </button>
          {!isDone && (
            <button
              type="button"
              onClick={onComplete}
              disabled={isPending}
              className="px-2 py-0.5 rounded text-[10px] font-semibold text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50 cursor-pointer"
            >
              Completar
            </button>
          )}
          {!isManager && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isPending}
              className="px-2 py-0.5 rounded text-[10px] font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50 cursor-pointer"
            >
              Borrar
            </button>
          )}
        </div>
      </div>
      {followup.summary && (
        <p className="mt-2 text-sp-admin-muted/80 italic pl-0 line-clamp-2">{followup.summary}</p>
      )}
    </div>
  );
}
