'use client';

import { FilterBar } from '@/components/admin/ui/FilterBar';
import {
  CAMPAIGN_STATUSES,
  CAMPAIGN_STATUS_LABELS,
} from '@/lib/schemas/campaign';
import {
  CRM_BRAND_SECTORES,
  CRM_BRAND_GEOS,
  SECTOR_LABELS,
  GEO_LABELS,
} from '@/lib/schemas/crmBrand';

import type { ChangeEventHandler } from 'react';
import type { CampaignStatus } from '@/lib/schemas/campaign';

// ── Types ─────────────────────────────────────────────────────────────────────

export type CampaignFilterState = {
  readonly search: string;
  readonly status: CampaignStatus | '';
  readonly brandId: string;
  readonly talentId: string;
  readonly responsibleUserId: string;
  readonly sector: string;
  readonly geo: string;
  readonly showArchived: boolean;
};

export const EMPTY_FILTERS: CampaignFilterState = {
  search: '',
  status: '',
  brandId: '',
  talentId: '',
  responsibleUserId: '',
  sector: '',
  geo: '',
  showArchived: false,
};

type BrandOption = { readonly id: number; readonly name: string };
type TalentOption = { readonly id: number; readonly name: string };
type StaffOption = { readonly id: string; readonly name: string };

type Props = {
  readonly filters: CampaignFilterState;
  readonly onChange: (next: CampaignFilterState) => void;
  readonly brands: readonly BrandOption[];
  readonly talents: readonly TalentOption[];
  readonly staffUsers: readonly StaffOption[];
};

// ── Status options ─────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  ...CAMPAIGN_STATUSES.map((s) => ({ value: s, label: CAMPAIGN_STATUS_LABELS[s] })),
];

// ── Sector options ─────────────────────────────────────────────────────────────

const SECTOR_OPTIONS = [
  { value: '', label: 'Todos los sectores' },
  ...CRM_BRAND_SECTORES.map((s) => ({ value: s, label: SECTOR_LABELS[s] })),
];

// ── Geo options ────────────────────────────────────────────────────────────────

const GEO_OPTIONS = [
  { value: '', label: 'Todos los geos' },
  ...CRM_BRAND_GEOS.map((g) => ({ value: g, label: GEO_LABELS[g] })),
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function isActive(f: CampaignFilterState): boolean {
  return (
    f.search !== '' ||
    f.status !== '' ||
    f.brandId !== '' ||
    f.talentId !== '' ||
    f.responsibleUserId !== '' ||
    f.sector !== '' ||
    f.geo !== '' ||
    f.showArchived
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export function CampaignFilters({
  filters,
  onChange,
  brands,
  talents,
  staffUsers,
}: Props): React.ReactElement {
  const set =
    <K extends keyof CampaignFilterState>(key: K) =>
    (value: CampaignFilterState[K]): void =>
      onChange({ ...filters, [key]: value });

  const handleSelect =
    <K extends keyof CampaignFilterState>(key: K): ChangeEventHandler<HTMLSelectElement> =>
    (e) =>
      set(key)(e.target.value as CampaignFilterState[K]);

  const brandOptions = [
    { value: '', label: 'Todas las marcas' },
    ...brands.map((b) => ({ value: String(b.id), label: b.name })),
  ];

  const talentOptions = [
    { value: '', label: 'Todos los influencers' },
    ...talents.map((t) => ({ value: String(t.id), label: t.name })),
  ];

  const staffOptions = [
    { value: '', label: 'Todos los responsables' },
    ...staffUsers.map((u) => ({ value: u.id, label: u.name })),
  ];

  return (
    <FilterBar>
      <FilterBar.Search
        id="campaign-search"
        value={filters.search}
        onChange={(e) => set('search')(e.target.value)}
        placeholder="Buscar campaña…"
      />

      <FilterBar.Select
        id="campaign-status"
        label="Estado"
        value={filters.status}
        onChange={handleSelect('status')}
        options={STATUS_OPTIONS}
      />

      <FilterBar.Select
        id="campaign-brand"
        label="Marca"
        value={filters.brandId}
        onChange={handleSelect('brandId')}
        options={brandOptions}
      />

      <FilterBar.Select
        id="campaign-talent"
        label="Influencer"
        value={filters.talentId}
        onChange={handleSelect('talentId')}
        options={talentOptions}
      />

      <FilterBar.Select
        id="campaign-responsible"
        label="Responsable"
        value={filters.responsibleUserId}
        onChange={handleSelect('responsibleUserId')}
        options={staffOptions}
      />

      <FilterBar.Select
        id="campaign-sector"
        label="Sector"
        value={filters.sector}
        onChange={handleSelect('sector')}
        options={SECTOR_OPTIONS}
      />

      <FilterBar.Select
        id="campaign-geo"
        label="Geo"
        value={filters.geo}
        onChange={handleSelect('geo')}
        options={GEO_OPTIONS}
      />

      {/* Toggle archivadas */}
      <label className="flex flex-col gap-1 min-w-0 self-end pb-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-sp-admin-muted">
          Archivadas
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={filters.showArchived}
          onClick={() => set('showArchived')(!filters.showArchived)}
          className={[
            'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
            'transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sp-admin-accent focus:ring-offset-1',
            filters.showArchived ? 'bg-sp-admin-accent' : 'bg-sp-admin-border',
          ].join(' ')}
        >
          <span
            aria-hidden="true"
            className={[
              'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0',
              'transition duration-200 ease-in-out',
              filters.showArchived ? 'translate-x-4' : 'translate-x-0',
            ].join(' ')}
          />
        </button>
      </label>

      <FilterBar.Reset active={isActive(filters)} onReset={() => onChange(EMPTY_FILTERS)} />
    </FilterBar>
  );
}
