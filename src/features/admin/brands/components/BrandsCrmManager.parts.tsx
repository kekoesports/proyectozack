'use client';

import {
  CRM_BRAND_STATUSES,
  CRM_BRAND_SECTORES,
  CRM_BRAND_GEOS,
  SECTOR_LABELS,
  GEO_LABELS,
  CRM_FOLLOWUP_CHANNELS,
  type CrmFollowupStatus,
} from '@/lib/schemas/crmBrand';
import type {
  CrmBrandStatus,
  BrandFollowupDerivedStatus,
  CampaignRow,
} from '@/types';
import type { Tone } from '@/features/admin/_shared/components/StateBadge';
import type { CampaignBrandSummary } from '@/lib/queries/campaigns';

export const STATUS_LABELS: Record<CrmBrandStatus, string> = {
  lead: 'Lead',
  contactada: 'Contactada',
  en_negociacion: 'En negociación',
  activa: 'Activa',
  pausada: 'Pausada',
  cerrada: 'Cerrada',
  no_interesa: 'No interesa',
  archivada: 'Archivada',
};

export const STATUS_TONE: Record<CrmBrandStatus, Tone> = {
  lead: 'info',
  contactada: 'warning',
  en_negociacion: 'warning',
  activa: 'success',
  pausada: 'neutral',
  cerrada: 'neutral',
  no_interesa: 'neutral',
  archivada: 'neutral',
};

export const FOLLOWUP_TONE: Record<BrandFollowupDerivedStatus, Tone> = {
  sin_followup: 'neutral',
  pendiente: 'info',
  hoy: 'warning',
  vencido: 'danger',
};

export const FOLLOWUP_LABEL: Record<BrandFollowupDerivedStatus, string> = {
  sin_followup: 'Sin follow-up',
  pendiente: 'Pendiente',
  hoy: 'Hoy',
  vencido: 'Vencido',
};

export const TIPO_LABELS: Record<string, string> = {
  agencia: 'Agencia',
  marca: 'Marca',
};

export const LABEL = 'block text-[11px] uppercase tracking-wider font-semibold text-sp-admin-muted mb-1';
export const BTN_PRIMARY = 'px-4 py-2 rounded-full text-sm font-bold text-sp-admin-bg bg-sp-admin-accent hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer';
export const BTN_GHOST = 'px-3 py-1.5 rounded-full text-xs font-semibold text-sp-admin-muted hover:text-sp-admin-text hover:bg-sp-admin-hover transition-colors cursor-pointer';

export type FilterState = {
  sector: string;
  geo: string;
  status: string;
  search: string;
};

export const INITIAL_FILTERS: FilterState = { sector: '', geo: '', status: '', search: '' };

export const SECTOR_OPTIONS = [
  { value: '', label: 'Todos los sectores' },
  ...CRM_BRAND_SECTORES.map((s) => ({ value: s, label: SECTOR_LABELS[s] })),
];

export const GEO_OPTIONS = [
  { value: '', label: 'Todas las geos' },
  ...CRM_BRAND_GEOS.map((g) => ({ value: g, label: GEO_LABELS[g] })),
];

export const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  ...CRM_BRAND_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
];

export function hasActiveFilters(f: FilterState, showArchived: boolean): boolean {
  return f.sector !== '' || f.geo !== '' || f.status !== '' || f.search !== '' || showArchived;
}

export const CHANNEL_LABELS: Record<(typeof CRM_FOLLOWUP_CHANNELS)[number], string> = {
  email: 'Email',
  telegram: 'Telegram',
  discord: 'Discord',
  whatsapp: 'WhatsApp',
  reunion: 'Reunión',
  llamada: 'Llamada',
  otro: 'Otro',
};

export const FOLLOWUP_STATUS_LABELS: Record<CrmFollowupStatus, string> = {
  pendiente: 'Pendiente',
  hecho: 'Hecho',
  vencido: 'Vencido',
};

export const FOLLOWUP_STATUS_TONE: Record<CrmFollowupStatus, Tone> = {
  pendiente: 'warning',
  hecho: 'success',
  vencido: 'danger',
};

export type BrandExpandTab = 'info' | 'campanas';

export function buildBrandSummary(campaigns: readonly CampaignRow[]): CampaignBrandSummary {
  let totalAmountBrand = 0;
  let totalAmountTalent = 0;
  for (const c of campaigns) {
    totalAmountBrand += Number(c.amountBrand);
    totalAmountTalent += Number(c.amountTalent);
  }
  return {
    campaigns,
    totalAmountBrand,
    totalCommission: totalAmountBrand - totalAmountTalent,
    count: campaigns.length,
  };
}
